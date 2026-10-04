<script>
  import EpoxyTransport from "@mercuryworkshop/epoxy-transport";
  import LibcurlClient from "@mercuryworkshop/libcurl-transport";

  let {
    transport = $bindable("epoxy"),
    wisp = $bindable(
      (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/wisp/",
    ),
    ready = $bindable(false),
    onready,
  } = $props();

  let defaultConfig;
  let rewriteUrl;
  let Controller;
  let HttpCachePlugin;
  let UrlWatcherPlugin;
  let CatchEscapedLinksPlugin;
  let EventHandlerPlugin;
  let LinkHandlerPlugin;
  let AdblockPlugin;

  let controller = $state();
  let scramjetLoaded = $state(false);
  let controllerLoaded = $state(false);
  let currentTransport = transport;
  let currentWisp = wisp;

  $effect(() => {
    if (scramjetLoaded && controllerLoaded) {
      initialize();
    }
  });

  async function createTransport() {
    let newTransport;

    switch (transport) {
      case "epoxy":
        newTransport = new EpoxyTransport({
          wisp,
        });
        break;
      case "libcurl":
        newTransport = new LibcurlClient({
          wisp,
        });
        break;
      default:
        throw new Error("Invalid transport");
        break;
    }

    await newTransport.init();

    return newTransport;
  }

  $effect(async () => {
    if (ready) {
      if (transport !== currentTransport || wisp !== currentWisp) {
        let newTransport = await createTransport();

        controller.transport = newTransport;
        currentTransport = transport;
        currentWisp = wisp;
      }
    }
  });

  async function initialize() {
    [
      { defaultConfig, rewriteUrl },
      { Controller },
      {
        HttpCachePlugin,
        UrlWatcherPlugin,
        CatchEscapedLinksPlugin,
        EventHandlerPlugin,
        LinkHandlerPlugin,
      },
      { AdblockPlugin },
    ] = await Promise.all([
      import("@mercuryworkshop/scramjet"),
      import("@mercuryworkshop/scramjet-controller"),
      import("@mercuryworkshop/scramjet-utils"),
      import("./AdblockPlugin.js"),
    ]);

    await navigator.serviceWorker.register("/sw.js");

    const registration = await navigator.serviceWorker.ready;

    const serviceworker =
      navigator.serviceWorker.controller ?? registration.active;

    let newTransport = await createTransport();

    controller = new Controller({
      serviceworker,
      transport: newTransport,
      scramjetConfig: defaultConfig,
    });

    await controller.wait();

    ready = true;

    if (onready) {
      onready();
    }
  }

  export function url(url, plugins = []) {
    if (ready) {
      let newFrame = controller.createFrame(null, plugins);

      return rewriteUrl(url, newFrame.context, {
        origin: new URL(location.href),
        base: new URL(location.href),
      });
    }
  }

  export function createFrame(...props) {
    return controller.createFrame(...props);
  }

  export const plugins = {
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
  };

  function fetch(...props) {
    if (transport === "epoxy") {
      return controller.transport.client.fetch(...props);
    } else if (transport === "libcurl") {
      return controller.transport.session.fetch(...props);
    }
  }

  async function autocomplete(query, engine = "google") {
    if (!query || !query.trim()) return [];

    const q = encodeURIComponent(query.trim());

    const endpoints = {
      google: `https://suggestqueries.google.com/complete/search?client=firefox&q=${q}`,
      duckduckgo: `https://duckduckgo.com/ac/?q=${q}`,
      bing: `https://api.bing.com/osjson.aspx?query=${q}`,
      brave: `https://search.brave.com/api/suggest?q=${q}`,
      yahoo: `https://ff.search.yahoo.com/gossip?output=fxjson&command=${q}`,
    };

    const url = endpoints[engine];

    if (!url) {
      throw new Error(
        `Unsupported engine "${engine}". Supported: google, duckduckgo, bing, brave, yahoo`,
      );
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      switch (engine) {
        case "google":
          return data[1];
        case "duckduckgo":
          return data.map((item) => item.phrase);
        case "bing":
          return data[1];
        case "brave":
          return data[1];
        case "yahoo":
          return data[1];
      }
    } catch (error) {
      console.error(`Autocomplete error (${engine}):`, error);
      return [];
    }
  }

  async function createDataURL(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function () {
          resolve(reader.result);
        };

        reader.readAsDataURL(blob);
      } catch {
        resolve(undefined);
      }
    });
  }

  const searchEngines = {
    google: "https://www.google.com/search?q=%s",
    duckduckgo: "https://duckduckgo.com/?q=%s",
    ddg: "https://duckduckgo.com/?q=%s",
    bing: "https://www.bing.com/search?q=%s",
    brave: "https://search.brave.com/search?q=%s",
    yahoo: "https://search.yahoo.com/search?p=%s",
  };

  export { fetch, autocomplete, createDataURL, searchEngines };
</script>

<svelte:head>
  <script
    src="./scramjet/scramjet.js"
    onload={() => (scramjetLoaded = true)}
  ></script>
  {#if scramjetLoaded}
    <script
      src="./controller/controller.api.js"
      onload={() => (controllerLoaded = true)}
    ></script>
  {/if}
</svelte:head>
