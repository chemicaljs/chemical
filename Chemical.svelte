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
    onready = undefined,
  } = $props();

  let defaultConfig;
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
      { defaultConfig },
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

  async function autocomplete(query) {
    function parseIntoParts(data) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, "text/html");

      return Array.from(doc.body.childNodes).map((node) => {
        return {
          text: node.textContent,
          highlight: node.nodeType === 1 && node.tagName === "B",
        };
      });
    }

    function decodeText(text) {
      const entities = {
        "&#39;": "'",
        "&apos;": "'",
        "&quot;": '"',
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
      };
      return text.replace(/&#?\w+;/g, (match) => entities[match] || match);
    }

    if (!query || !query.trim()) return [];

    const q = encodeURIComponent(query.trim());

    try {
      const request = await fetch(
        "https://www.google.com/complete/s?q=" + q + "&client=gws-wiz",
      );
      const results = await request.text();
      const parsedResults = JSON.parse(
        results.split("window.google.ac.h(")[1].slice(0, -1),
      )[0];

      const resultsData = parsedResults.map(async (item) => {
        if (item[3] && item[3].zh) {
          let data = {
            title: decodeText(item[3].zh),
          };

          if (item[3].zi) {
            data.description = decodeText(item[3].zi);
          }

          if (item[3].zs) {
            let image = await createDataURL(item[3].zs);
            data.image = image;
          }

          return {
            type: "rich",
            data,
          };
        } else {
          return {
            type: "plain",
            data: parseIntoParts(item[0]),
            fullURL: parseIntoParts(item[0])
              .map((item) => item.text)
              .join(""),
          };
        }
      });
      return await Promise.all(resultsData);
    } catch (error) {
      console.error("Autocomplete error", error);
      return [];
    }
  }

  export { fetch, autocomplete, createDataURL };
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
