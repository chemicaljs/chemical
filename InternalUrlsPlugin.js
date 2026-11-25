function normalizeScheme(scheme = "internal") {
  return String(scheme)
    .trim()
    .replace(/:\/?\/?$/, "")
    .toLowerCase();
}

function normalizePath(path = "") {
  return String(path)
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function normalizeRoute(route) {
  if (!route) return null;
  if (typeof route === "string") return { html: route };
  if (typeof route === "function") return { component: route };
  if (typeof route === "object") return route;
  return null;
}

function matchPattern(pattern, path) {
  const normPattern = normalizePath(pattern);
  const normPath = normalizePath(path);

  if (normPattern === "*") return { "*": normPath };
  if (normPattern.toLowerCase() === normPath.toLowerCase()) return {};

  const pParts = normPattern ? normPattern.split("/") : [];
  const uParts = normPath ? normPath.split("/") : [];
  const params = {};

  for (let i = 0; i < pParts.length; i++) {
    const seg = pParts[i];
    if (seg === "*") {
      params["*"] = uParts.slice(i).join("/");
      return params;
    }
    if (i >= uParts.length) return null;
    if (seg.startsWith(":")) {
      try {
        params[seg.slice(1)] = decodeURIComponent(uParts[i]);
      } catch {
        params[seg.slice(1)] = uParts[i];
      }
    } else if (seg.toLowerCase() !== uParts[i].toLowerCase()) {
      return null;
    }
  }

  return pParts.length === uParts.length ? params : null;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function defaultNotFound({ url }) {
  return {
    title: "Page Not Found",
    html: `<!doctype html>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family: system-ui, -apple-system, sans-serif;
    background: #1e1e1e;
    color: #e8eaed;
  }
  main { text-align: center; padding: 24px; }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p { margin: 0; font-size: 13px; color: #9aa0a6; }
</style>
<main>
  <h1>Page not found</h1>
  <p>No internal route matches ${escapeHtml(url)}</p>
</main>`,
  };
}

export class InternalUrlsPlugin {
  __chemicalInternalUrls = true;
  name = "chemical-internal-urls";

  constructor({
    scheme = "internal",
    routes = {},
    fallback = undefined,
    history = false,
  } = {}) {
    this.scheme = normalizeScheme(scheme);
    this.fallback = normalizeRoute(fallback);
    this.history = Boolean(history);
    this.routes = new Map();

    for (const [pattern, route] of Object.entries(routes)) {
      this.register(pattern, route);
    }
  }

  register(pattern, route) {
    const normalized = normalizeRoute(route);
    if (!normalized) return this;
    this.routes.set(normalizePath(pattern), normalized);
    return this;
  }

  unregister(pattern) {
    this.routes.delete(normalizePath(pattern));
    return this;
  }

  parse(rawUrl) {
    const raw = String(rawUrl ?? "").trim();
    const prefix = `${this.scheme}://`;
    if (!raw.toLowerCase().startsWith(prefix)) return null;

    try {
      const parsed = new URL(raw);
      const path = normalizePath(
        parsed.hostname + (parsed.pathname === "/" ? "" : parsed.pathname),
      );
      const url = `${this.scheme}://${path}${parsed.search}${parsed.hash}`;
      return {
        url,
        scheme: this.scheme,
        path,
        searchParams: parsed.searchParams,
        hash: parsed.hash,
      };
    } catch {
      return null;
    }
  }

  matches(rawUrl) {
    return Boolean(this.parse(rawUrl));
  }

  resolve(rawUrl) {
    const parsed = this.parse(rawUrl);
    if (!parsed) return null;

    let matchedRoute = null;
    let matchedParams = {};
    let wildcardMatch = null;
    let catchAll = null;

    for (const [pattern, route] of this.routes) {
      if (pattern === "*") {
        catchAll = route;
        continue;
      }
      const isDynamic = pattern.includes(":") || pattern.includes("*");
      const params = matchPattern(pattern, parsed.path);
      if (!params) continue;

      if (!isDynamic) {
        matchedRoute = route;
        matchedParams = params;
        break;
      }
      if (!wildcardMatch) {
        wildcardMatch = { route, params };
      }
    }

    if (!matchedRoute && wildcardMatch) {
      matchedRoute = wildcardMatch.route;
      matchedParams = wildcardMatch.params;
    }

    if (!matchedRoute) {
      matchedRoute = catchAll ?? this.fallback ?? defaultNotFound(parsed);
      matchedParams = { "*": parsed.path };
    }

    return {
      ...parsed,
      params: matchedParams,
      route: matchedRoute,
      history:
        matchedRoute.history !== undefined
          ? Boolean(matchedRoute.history)
          : this.history,
    };
  }

  suggest(query) {
    const raw = String(query ?? "")
      .trim()
      .toLowerCase();
    const prefix = `${this.scheme}://`;
    if (!raw.startsWith(prefix)) return [];

    const term = normalizePath(raw.slice(prefix.length));
    const results = [];

    for (const [pattern, route] of this.routes) {
      if (pattern === "*" || pattern.includes(":") || pattern.includes("*")) {
        continue;
      }
      const title = typeof route.title === "string" ? route.title : "";
      if (
        !term ||
        pattern.toLowerCase().includes(term) ||
        title.toLowerCase().includes(term)
      ) {
        const data = { title: `${prefix}${pattern}` };
        if (title) data.description = title;
        if (typeof route.favicon === "string" && route.favicon) {
          data.image = route.favicon;
        }
        results.push({ type: "rich", data });
      }
    }

    return results;
  }
}

export default InternalUrlsPlugin;
