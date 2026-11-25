<script>
  import EpoxyTransport from "@mercuryworkshop/epoxy-transport";
  import LibcurlClient from "@mercuryworkshop/libcurl-transport";
  import { evaluate } from "mathjs";
  import { InternalUrlsPlugin } from "./InternalUrlsPlugin.js";

  let {
    transport = $bindable("epoxy"),
    wisp = $bindable(
      typeof location !== "undefined"
        ? (location.protocol === "https:" ? "wss" : "ws") +
            "://" +
            location.host +
            "/wisp/"
        : "",
    ),
    ready = $bindable(false),
    onready = undefined,
    plugins: defaultPlugins = [],
    adblock: defaultAdblock = undefined,
  } = $props();

  let defaultConfig;
  let Controller;
  let ManagedPlugin;
  let HttpCachePlugin;
  let UrlWatcherPlugin;
  let CatchEscapedLinksPlugin;
  let EventHandlerPlugin;
  let LinkHandlerPlugin;
  let AdblockPlugin;

  let controller;
  let scramjetLoaded = $state(false);
  let controllerLoaded = $state(false);
  let initializing = false;
  let currentTransport = transport;
  let currentWisp = wisp;

  async function createTransport(kind = transport, wispUrl = wisp) {
    let instance;
    if (kind === "epoxy") {
      instance = new EpoxyTransport({ wisp: wispUrl });
    } else if (kind === "libcurl") {
      instance = new LibcurlClient({ wisp: wispUrl });
    } else {
      throw new Error(`Invalid transport: ${kind}`);
    }
    await instance.init();
    return instance;
  }

  async function initialize() {
    const [scramjetMod, controllerMod, utilsMod, adblockMod] =
      await Promise.all([
        import("@mercuryworkshop/scramjet"),
        import("@mercuryworkshop/scramjet-controller"),
        import("@mercuryworkshop/scramjet-utils"),
        import("./AdblockPlugin.js"),
      ]);

    ({ defaultConfig } = scramjetMod);
    ({ Controller } = controllerMod);
    ({
      HttpCachePlugin,
      UrlWatcherPlugin,
      CatchEscapedLinksPlugin,
      EventHandlerPlugin,
      LinkHandlerPlugin,
    } = utilsMod);
    ({ AdblockPlugin } = adblockMod);

    ManagedPlugin =
      controllerMod.ManagedPlugin ??
      utilsMod.ManagedPlugin ??
      Object.getPrototypeOf(EventHandlerPlugin);

    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    const serviceworker =
      navigator.serviceWorker.controller ?? registration.active;

    controller = new Controller({
      serviceworker,
      transport: await createTransport(),
      scramjetConfig: defaultConfig,
    });

    await controller.wait();
    ready = true;
    onready?.();
  }

  $effect(() => {
    if (scramjetLoaded && controllerLoaded && !initializing) {
      initializing = true;
      initialize();
    }
  });

  $effect(() => {
    if (!ready || (transport === currentTransport && wisp === currentWisp)) {
      return;
    }

    const nextTransport = transport;
    const nextWisp = wisp;
    let cancelled = false;

    createTransport(nextTransport, nextWisp)
      .then((instance) => {
        if (cancelled) return;
        controller.transport = instance;
        currentTransport = nextTransport;
        currentWisp = nextWisp;
      })
      .catch((error) => {
        if (!cancelled) console.error("Transport switch error", error);
      });

    return () => {
      cancelled = true;
    };
  });

  export const plugins = {
    get ManagedPlugin() {
      return ManagedPlugin;
    },
    get HttpCachePlugin() {
      return HttpCachePlugin;
    },
    get UrlWatcherPlugin() {
      return UrlWatcherPlugin;
    },
    get CatchEscapedLinksPlugin() {
      return CatchEscapedLinksPlugin;
    },
    get EventHandlerPlugin() {
      return EventHandlerPlugin;
    },
    get LinkHandlerPlugin() {
      return LinkHandlerPlugin;
    },
    get AdblockPlugin() {
      return AdblockPlugin;
    },
    get InternalUrlsPlugin() {
      return InternalUrlsPlugin;
    },
  };

  export const defaults = {
    get plugins() {
      return defaultPlugins;
    },
    get adblock() {
      return defaultAdblock;
    },
  };

  export function createPlugin({ name, dependencies = [], install }) {
    if (!ManagedPlugin) throw new Error("Chemical is not ready yet");

    const plugin = new ManagedPlugin(name, dependencies);
    const baseInstall = ManagedPlugin.prototype.install;
    plugin.install = function (frame) {
      baseInstall?.call(this, frame);
      return install.call(this, frame, this);
    };
    return plugin;
  }

  const pluginApi = {
    plugins,
    createPlugin,
    fetch: (...args) => fetch(...args),
    createDataURL: (...args) => createDataURL(...args),
  };

  function resolvePlugins(entries) {
    const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
    const resolved = [];

    for (const entry of list) {
      if (!entry || entry.__chemicalInternalUrls) continue;

      if (typeof entry === "function") {
        if (typeof entry.prototype?.install === "function") {
          const instance = new entry();
          if (!instance.__chemicalInternalUrls) resolved.push(instance);
        } else {
          resolved.push(...resolvePlugins(entry(pluginApi)));
        }
      } else if (typeof entry === "object") {
        const isManaged =
          (ManagedPlugin && entry instanceof ManagedPlugin) ||
          typeof entry.tap === "function";
        resolved.push(
          !isManaged && typeof entry.install === "function"
            ? createPlugin(entry)
            : entry,
        );
      }
    }

    return resolved;
  }

  export function createFrame(iframe, options = {}) {
    const all = [
      ...resolvePlugins(options.plugins),
      ...resolvePlugins(defaultPlugins),
    ];

    let eventHandler = null;
    const rest = [];

    for (const plugin of all) {
      const isEventHandler =
        (EventHandlerPlugin && plugin instanceof EventHandlerPlugin) ||
        plugin?.name === "event-handler";

      if (isEventHandler) {
        eventHandler ??= plugin;
      } else {
        rest.push(plugin);
      }
    }

    return controller.createFrame(iframe, {
      ...options,
      plugins: eventHandler ? [eventHandler, ...rest] : rest,
    });
  }

  export function fetch(...args) {
    if (!controller?.transport) {
      throw new Error("Chemical is not ready yet");
    }
    if (transport === "epoxy") {
      return controller.transport.client.fetch(...args);
    }
    if (transport === "libcurl") {
      return controller.transport.session.fetch(...args);
    }
  }

  export async function createDataURL(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) return undefined;
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  }

  function evaluateMath(rawQuery) {
    const query = rawQuery.toLowerCase();
    if (!isNaN(Number(query))) return null;

    const normalized = query
      .replace(/\bto\s+in\b/g, "to inch")
      .replace(/(\d\s*)in\b/g, "$1inch");

    try {
      const result = evaluate(normalized);
      const compactQuery = query.replace(/\s/g, "");

      if (typeof result === "number" && Number.isFinite(result)) {
        const text = String(parseFloat(result.toFixed(6)));
        return text === compactQuery ? null : text;
      }

      if (result && (result.isUnit || result.type === "Unit")) {
        const text = result.toString();
        const compactResult = text.replace(/\s/g, "").replace("inch", "in");
        return compactResult === compactQuery ? null : text;
      }

      return null;
    } catch {
      return null;
    }
  }

  export async function autocomplete(query) {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const internalPlugins = (
      Array.isArray(defaultPlugins) ? defaultPlugins : [defaultPlugins]
    ).filter((p) => p?.__chemicalInternalUrls);

    const internalMatches = internalPlugins.flatMap((p) => p.suggest(trimmed));
    if (
      internalMatches.length ||
      internalPlugins.some((p) => p.matches(trimmed))
    ) {
      return internalMatches;
    }

    const mathResult = evaluateMath(trimmed);
    const mathItems = mathResult
      ? [{ type: "math", data: { equation: trimmed, result: mathResult } }]
      : [];

    try {
      const res = await fetch(
        `https://www.google.com/complete/s?q=${encodeURIComponent(trimmed)}&client=gws-wiz`,
      );
      const body = await res.text();
      const rawJson = body
        .split("window.google.ac.h(")[1]
        ?.replace(/\);?\s*$/, "");

      if (!rawJson) return mathItems;

      const parser = new DOMParser();
      const decode = (html) =>
        parser.parseFromString(html, "text/html").body.textContent ?? "";
      const fetchImage = (url) =>
        Promise.race([
          createDataURL(url),
          new Promise((resolve) => setTimeout(() => resolve(undefined), 500)),
        ]);

      const entries = JSON.parse(rawJson)[0] ?? [];
      const suggestions = await Promise.all(
        entries.map(async (item) => {
          const meta = item[3];
          if (meta?.zh) {
            const data = { title: decode(meta.zh) };
            if (meta.zi) data.description = decode(meta.zi);
            if (meta.zs) {
              const image = await fetchImage(meta.zs);
              if (image) data.image = image;
            }
            return { type: "rich", data };
          }

          const doc = parser.parseFromString(item[0], "text/html");
          const parts = Array.from(doc.body.childNodes, (node) => ({
            text: node.textContent,
            highlight: node.nodeType === 1 && node.tagName === "B",
          }));

          return {
            type: "plain",
            data: parts,
            fullURL: parts.map((p) => p.text).join(""),
          };
        }),
      );

      return [...mathItems, ...suggestions];
    } catch (error) {
      console.error("Autocomplete error", error);
      return mathItems;
    }
  }
</script>

<svelte:head>
  <script
    src="/scramjet/scramjet.js"
    onload={() => (scramjetLoaded = true)}
  ></script>
  {#if scramjetLoaded}
    <script
      src="/controller/controller.api.js"
      onload={() => (controllerLoaded = true)}
    ></script>
  {/if}
</svelte:head>
