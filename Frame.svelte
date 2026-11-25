<script>
  import { untrack } from "svelte";
  import blacklistText from "./blacklist.txt?raw";

  const MAX_HISTORY = 500;

  let {
    ready = $bindable(),
    chemical = $bindable(),
    class: className,
    src = $bindable(),
    autoHttps = false,
    searchEngine = undefined,
    onchange = undefined,
    ontitle = undefined,
    onfavicon = undefined,
    cache = false,
    linkhandler = undefined,
    catchlinks = undefined,
    adblock = undefined,
    persist = false,
    trackHistory = true,
    initialHistory = undefined,
    initialHistoryIndex = undefined,
    plugins: userPlugins = [],
    onpointerdown = undefined,
    onkeydown = undefined,
    onload = undefined,
    ...restProps
  } = $props();

  function isSameOrigin(url) {
    if (typeof location === "undefined") return false;
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return false;
    }
  }

  function getStorageKey() {
    if (!trackHistory) return null;
    if (persist === true) return "chemical:history";
    return typeof persist === "string" && persist ? persist : null;
  }

  function loadHistory() {
    const key = getStorageKey();
    if (!key || typeof localStorage === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(
          (item) =>
            typeof item?.url === "string" &&
            item.url &&
            !isSameOrigin(item.url),
        )
        .slice(0, MAX_HISTORY)
        .map((item) => ({
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : crypto.randomUUID(),
          url: item.url,
          title:
            typeof item.title === "string" && item.title
              ? item.title
              : item.url,
          favicon: typeof item.favicon === "string" ? item.favicon : "",
          timestamp:
            typeof item.timestamp === "number" ? item.timestamp : Date.now(),
        }));
    } catch {
      return [];
    }
  }

  const hasInitialHistory =
    Array.isArray(initialHistory) && initialHistory.length > 0;
  let navHistory = $state(
    hasInitialHistory ? [...initialHistory] : src ? [] : [""],
  );
  let navIndex = $state(
    hasInitialHistory
      ? Math.max(
          0,
          Math.min(
            initialHistory.length - 1,
            typeof initialHistoryIndex === "number"
              ? initialHistoryIndex
              : initialHistory.length - 1,
          ),
        )
      : src
        ? -1
        : 0,
  );
  let history = $state(loadHistory());
  let storageKey = $derived(getStorageKey());

  let frame = $state.raw();
  let frameRef = $state();
  let resetKey = $state(0);
  let loadedSrc;
  let pendingGo = null;
  let pendingHistoryNav = hasInitialHistory && Boolean(src);
  let historyNavSeen = false;
  let historyNavSettled = false;
  let currentUrl = "";
  let currentTitle = "";
  let currentFavicon = "";
  let currentEntryId = null;
  let headObserver = null;

  $effect(() => {
    if (!storageKey || typeof localStorage === "undefined") return;
    const payload = history.map(({ id, url, title, favicon, timestamp }) => ({
      id,
      url,
      title,
      favicon,
      timestamp,
    }));
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(payload.map((entry) => ({ ...entry, favicon: "" }))),
        );
      } catch {}
    }
  });

  function clearPendingHistory() {
    pendingHistoryNav = false;
    historyNavSeen = false;
    historyNavSettled = false;
  }

  function resolveUrl(targetSrc, options = {}) {
    const raw = String(targetSrc ?? "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;

    const { autoHttps: https = false, searchEngine: engine } = options;
    if (https && raw.includes(".") && !raw.includes(" ")) {
      return "https://" + raw;
    }
    return engine ? engine.replace("%s", encodeURIComponent(raw)) : raw;
  }

  function buildAdblockPlugin(config, chem) {
    if (!config) return null;

    const { AdblockPlugin } = chem.plugins;

    if (typeof config === "function") {
      return typeof config.prototype?.install === "function"
        ? new config()
        : config({
            chemical: chem,
            defaultRuleset: blacklistText,
            AdblockPlugin,
          });
    }

    if (typeof config === "object" && typeof config.install === "function") {
      return config;
    }

    if (config === true) {
      return new AdblockPlugin({ rawRulesets: [blacklistText] });
    }

    if (typeof config === "string" || Array.isArray(config)) {
      const rawRulesets = [config].flat().filter(Boolean);
      return rawRulesets.length ? new AdblockPlugin({ rawRulesets }) : null;
    }

    const {
      rawRulesets,
      extraRulesets,
      includeDefault = rawRulesets === undefined,
      plugin: Plugin = AdblockPlugin,
      ...rest
    } = config;

    const rulesets = [
      ...(includeDefault ? [blacklistText] : []),
      ...[rawRulesets, extraRulesets].flat().filter(Boolean),
    ];

    return new Plugin({ ...rest, rawRulesets: rulesets });
  }

  function unrewriteProxyUrl(candidate, client, activeFrame) {
    try {
      const fromClient = client?.unrewriteUrl?.(candidate);
      if (fromClient && !isSameOrigin(fromClient)) return String(fromClient);
    } catch {}

    try {
      const parsed = new URL(candidate, location.href);
      const prefix = activeFrame?.prefix;
      if (
        prefix &&
        parsed.origin === location.origin &&
        parsed.pathname.startsWith(prefix)
      ) {
        const rawRest = parsed.pathname.slice(prefix.length);
        const decodedPath = /^https?%3A/i.test(rawRest)
          ? decodeURIComponent(rawRest)
          : rawRest;
        const rest = decodedPath + parsed.search + parsed.hash;
        if (/^https?:\/\//i.test(rest) && !isSameOrigin(rest)) return rest;
      }
    } catch {}

    try {
      const decoded =
        chemical?.decode?.(candidate) ||
        globalThis.$scramjet?.decodeUrl?.(candidate);
      if (decoded && !isSameOrigin(decoded)) return String(decoded);
    } catch {}

    return "";
  }

  function decodeOpenUrl(url, base, client, activeFrame) {
    const raw = String(url ?? "").trim();
    if (!raw || raw === "about:blank" || /^javascript:/i.test(raw)) return "";

    if (
      raw.startsWith(location.origin) ||
      (activeFrame?.prefix && raw.startsWith(activeFrame.prefix))
    ) {
      return unrewriteProxyUrl(
        new URL(raw, location.origin).href,
        client,
        activeFrame,
      );
    }

    try {
      const safeBase = base && !isSameOrigin(String(base)) ? String(base) : "";
      const candidate = safeBase
        ? new URL(raw, safeBase).href
        : new URL(raw).href;
      if (isSameOrigin(candidate)) {
        return unrewriteProxyUrl(candidate, client, activeFrame);
      }
      return candidate;
    } catch {
      return "";
    }
  }

  function patchWindowOpen(win, getBaseUrl, client, activeFrame) {
    if (!win) return;

    const openTarget = (url = "", target = "_blank") => {
      const resolved = decodeOpenUrl(
        url,
        getBaseUrl?.() || currentUrl,
        client,
        activeFrame,
      );
      const t = String(target || "").toLowerCase();

      if (t === "_self" || t === "_parent" || t === "_top") {
        if (resolved) go(resolved);
        return win;
      }

      if (!linkhandler) {
        if (resolved) go(resolved);
        return win;
      }

      const handle = linkhandler(resolved);
      const navigatePopup = (next) => {
        const nextUrl = decodeOpenUrl(
          next,
          getBaseUrl?.() || currentUrl,
          client,
          activeFrame,
        );
        if (!nextUrl) return;
        if (handle?.location) handle.location.href = nextUrl;
        else linkhandler(nextUrl);
      };

      return {
        get closed() {
          return Boolean(handle?.closed);
        },
        close: () => handle?.close?.(),
        focus: () => handle?.focus?.(),
        location: {
          get href() {
            return handle?.location?.href ?? resolved;
          },
          set href(next) {
            navigatePopup(next);
          },
          assign: navigatePopup,
          replace: navigatePopup,
        },
      };
    };
    openTarget.__chemicalPatched = true;

    for (const host of [win, win.Window?.prototype]) {
      if (!host || host.open?.__chemicalPatched) continue;
      try {
        Object.defineProperty(host, "open", {
          value: openTarget,
          configurable: true,
          writable: true,
        });
      } catch {
        try {
          host.open = openTarget;
        } catch {}
      }
    }
  }

  function recordVisit(url, favicon = "") {
    if (!trackHistory) return;
    if (!url) {
      currentEntryId = null;
      return;
    }

    const existing = currentEntryId
      ? history.find((item) => item.id === currentEntryId)
      : null;
    if (existing && existing.url === url) {
      existing.timestamp = Date.now();
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      url,
      title: url,
      favicon,
      timestamp: Date.now(),
    };
    currentEntryId = entry.id;
    history = [entry, ...history].slice(0, MAX_HISTORY);
  }

  function patchVisit(patch) {
    if (!trackHistory || !currentEntryId) return;
    const entry = history.find((item) => item.id === currentEntryId);
    if (!entry) return;
    if (patch.title) entry.title = patch.title;
    if (patch.favicon !== undefined) entry.favicon = patch.favicon;
  }

  async function fetchFavicon(url) {
    if (!url || isSameOrigin(url)) return "";
    const data = await chemical?.createDataURL?.(url);
    return typeof data === "string" &&
      data.startsWith("data:") &&
      !data.startsWith("data:text/") &&
      !data.startsWith("data:application/json")
      ? data
      : "";
  }

  function syncTitle(rawTitle) {
    const title = (rawTitle || getTitle() || "").trim();
    if (!title) return;
    if (currentTitle !== title) {
      currentTitle = title;
      ontitle?.(title);
    }
    patchVisit({ title });
  }

  async function syncMeta(iframe = frameRef) {
    const targetUrl = currentUrl;
    syncTitle(iframe?.contentDocument?.title);
    if (!targetUrl || isSameOrigin(targetUrl)) return;

    let icon = "";
    try {
      const link = iframe?.contentDocument?.querySelector('link[rel~="icon"]');
      const raw = link?.getAttribute("href") || "";
      const href = link?.href || "";

      if (href.startsWith("data:")) {
        icon = href;
      } else if (raw) {
        const unrewritten = isSameOrigin(href)
          ? unrewriteProxyUrl(href, null, frame)
          : "";
        const resolved = unrewritten || new URL(raw, targetUrl).href;
        if (resolved && !isSameOrigin(resolved)) {
          icon = await fetchFavicon(resolved);
        }
      }
    } catch {}

    if (!icon) {
      try {
        const u = new URL(targetUrl);
        if (u.protocol === "http:" || u.protocol === "https:") {
          icon = await fetchFavicon(new URL("/favicon.ico", u.origin).href);
        }
      } catch {}
    }

    if (currentUrl === targetUrl) {
      currentFavicon = icon;
      onfavicon?.(icon);
      if (icon) patchVisit({ favicon: icon });
    }
  }

  function observeHead(iframe = frameRef) {
    headObserver?.disconnect();
    headObserver = null;

    try {
      const doc = iframe?.contentDocument;
      const head = doc?.head || doc?.documentElement;
      if (!doc || !head) return;

      let title = doc.title;
      headObserver = new MutationObserver((mutations) => {
        if (doc.title !== title) {
          title = doc.title;
          syncTitle(doc.title);
        }

        if (
          mutations.some(
            ({ target, addedNodes }) =>
              target?.matches?.('link[rel~="icon"]') ||
              [...addedNodes].some((node) =>
                node.matches?.('link[rel~="icon"]'),
              ),
          )
        ) {
          syncMeta(iframe);
        }
      });

      headObserver.observe(head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["href", "rel"],
      });
    } catch {}
  }

  function handleUrlChange(rawUrl) {
    const url = rawUrl ? String(rawUrl) : "";
    if (url && isSameOrigin(url)) return;

    const fromHistory = pendingHistoryNav;
    if (fromHistory) {
      historyNavSeen = true;
      if (navIndex >= 0 && navIndex < navHistory.length) {
        navHistory[navIndex] = url;
      }
      if (historyNavSettled) {
        clearPendingHistory();
      }
    } else if (navHistory.length === 0) {
      navHistory = [url];
      navIndex = 0;
    } else if (navHistory[navIndex] !== url) {
      navHistory = [...navHistory.slice(0, navIndex + 1), url];
      navIndex = navHistory.length - 1;
    }

    let originChanged = !url;
    try {
      originChanged = new URL(currentUrl).origin !== new URL(url).origin;
    } catch {}

    currentUrl = url;
    if (originChanged) {
      currentFavicon = "";
      onfavicon?.("");
    }
    if (!url) {
      currentTitle = "";
      ontitle?.("");
    }

    if (!fromHistory) {
      recordVisit(url, originChanged ? "" : currentFavicon);
    }

    onchange?.(url, { fromHistory });
    syncMeta();
  }

  const handlePointerDown = (e) => {
    clearPendingHistory();
    onpointerdown?.(e);
  };
  const handleKeydown = (e) => {
    clearPendingHistory();
    onkeydown?.(e);
  };

  function bindFrameEvents() {
    try {
      const win = frameRef?.contentWindow;
      if (!win) return;

      win.removeEventListener("pointerdown", handlePointerDown);
      win.removeEventListener("keydown", handleKeydown);
      win.addEventListener("pointerdown", handlePointerDown);
      win.addEventListener("keydown", handleKeydown);
    } catch {}
  }

  function loadUrl(finalUrl) {
    if (!finalUrl || isSameOrigin(finalUrl)) return false;
    if (frame) {
      frame.go(finalUrl);
    } else {
      pendingGo = finalUrl;
    }
    return true;
  }

  function clearFrame() {
    headObserver?.disconnect();
    headObserver = null;
    loadedSrc = src;
    pendingGo = null;
    clearPendingHistory();
    currentUrl = "";
    currentTitle = "";
    currentFavicon = "";
    currentEntryId = null;
    resetKey++;
  }

  $effect(() => {
    if (!ready || !chemical || !frameRef) {
      frame = undefined;
      return;
    }

    const created = untrack(() => {
      const plugins = [
        new chemical.plugins.UrlWatcherPlugin((url) => handleUrlChange(url)),
        {
          name: "chemical-window-open",
          install(f, plugin) {
            plugin.tap(f.hooks.init.post, (context) => {
              patchWindowOpen(
                context.window,
                () => context.client?.url || currentUrl,
                context.client,
                f,
              );
            });
          },
        },
      ];

      if (cache) {
        plugins.push(new chemical.plugins.HttpCachePlugin());
      }

      if (linkhandler) {
        plugins.push(
          new chemical.plugins.EventHandlerPlugin(),
          new chemical.plugins.LinkHandlerPlugin((url) => linkhandler?.(url)),
        );
      }

      if (catchlinks) {
        plugins.push(
          new chemical.plugins.CatchEscapedLinksPlugin((url) =>
            catchlinks?.(url),
          ),
        );
      }

      const adblockConfig =
        adblock !== undefined ? adblock : chemical.defaults?.adblock;
      const adblocker = buildAdblockPlugin(adblockConfig, chemical);
      if (adblocker) plugins.push(adblocker);

      if (userPlugins) {
        plugins.push(...[userPlugins].flat().filter(Boolean));
      }

      return chemical.createFrame(frameRef, { plugins });
    });

    frame = created;
    bindFrameEvents();

    if (pendingGo) {
      const next = pendingGo;
      pendingGo = null;
      created.go(next);
    }

    return () => {
      headObserver?.disconnect();
      headObserver = null;
      try {
        created?.destroy?.();
      } catch {}
    };
  });

  $effect(() => {
    if (frame && src && src !== loadedSrc) {
      const isInitial = loadedSrc === undefined;
      loadedSrc = src;
      untrack(() => {
        if (!isInitial) clearPendingHistory();
        loadUrl(resolveUrl(src, { autoHttps, searchEngine }));
      });
    }
  });

  export function go(targetSrc, options = {}) {
    const finalUrl = resolveUrl(targetSrc, options);
    if (!finalUrl || isSameOrigin(finalUrl)) return;
    clearPendingHistory();
    loadUrl(finalUrl);
  }

  export function reset() {
    src = "";
    clearFrame();
    navHistory = [""];
    navIndex = 0;
  }

  export function reload() {
    if (!currentUrl) return;
    frameRef?.contentWindow?.location.reload();
  }

  function navigateHistory(delta) {
    const nextIndex = navIndex + delta;
    if (nextIndex < 0 || nextIndex >= navHistory.length) return false;

    const target = navHistory[nextIndex];
    if (!target) {
      navIndex = nextIndex;
      clearFrame();
      onfavicon?.("");
      ontitle?.("");
      onchange?.("", { fromHistory: true });
      return true;
    }

    const finalUrl = resolveUrl(target);
    if (!finalUrl || isSameOrigin(finalUrl)) return false;

    navIndex = nextIndex;
    currentEntryId = null;

    let sameDoc = false;
    try {
      const a = new URL(currentUrl);
      const b = new URL(finalUrl);
      sameDoc =
        a.origin === b.origin &&
        a.pathname === b.pathname &&
        a.search === b.search &&
        a.hash !== b.hash;
    } catch {}

    pendingHistoryNav = true;
    historyNavSeen = false;
    historyNavSettled = sameDoc;
    loadUrl(finalUrl);
    return true;
  }

  export function canBack() {
    return navIndex > 0;
  }

  export function canForward() {
    return navIndex < navHistory.length - 1;
  }

  export function back() {
    return navigateHistory(-1);
  }

  export function forward() {
    return navigateHistory(1);
  }

  export function getNavState() {
    return { history: navHistory, index: navIndex };
  }

  export function getHistory() {
    return history;
  }

  export function removeHistory(id) {
    history = history.filter((entry) => entry.id !== id);
    if (currentEntryId === id) currentEntryId = null;
  }

  export function clearHistory() {
    history = [];
    currentEntryId = null;
  }

  export function getTitle() {
    try {
      return frameRef?.contentWindow?.document.title || "";
    } catch {
      return "";
    }
  }

  export function getFavicon() {
    return currentFavicon;
  }

  export function fullscreen() {
    return frameRef?.requestFullscreen?.();
  }
</script>

{#key resetKey}
  <iframe
    bind:this={frameRef}
    onload={(e) => {
      bindFrameEvents();
      observeHead(e.currentTarget);
      syncMeta(e.currentTarget);
      if (pendingHistoryNav) {
        if (historyNavSeen) clearPendingHistory();
        else historyNavSettled = true;
      }
      onload?.(e);
    }}
    class={className}
    {...restProps}
  ></iframe>
{/key}
