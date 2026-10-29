<script>
  import blacklistText from "./blacklist.txt?raw";

  let {
    ready = $bindable(),
    chemical = $bindable(),
    class: className,
    src = $bindable(),
    onchange = undefined,
    cache = false,
    linkhandler = undefined,
    catchlinks = undefined,
    adblock = false,
    onpointerdown = undefined,
    pointerdown = undefined,
    onkeydown = undefined,
    onload = undefined,
    ...restProps
  } = $props();

  let frame;
  let frameRef = $state();

  function handlePointerDown(e) {
    onpointerdown?.(e);
    pointerdown?.(e);
  }

  function handleKeydown(e) {
    onkeydown?.(e);
  }

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

  function handleLoad(e) {
    bindFrameEvents();
    onload?.(e);
  }

  $effect(() => {
    if (ready && chemical) {
      let plugins = [];

      if (onchange) {
        const urlWatcher = new chemical.plugins.UrlWatcherPlugin((url) =>
          onchange(url),
        );
        plugins.push(urlWatcher);
      }

      if (cache) {
        const cachePlugin = new chemical.plugins.HttpCachePlugin();
        plugins.push(cachePlugin);
      }

      if (linkhandler) {
        plugins.push(new chemical.plugins.EventHandlerPlugin());
        const linkHandler = new chemical.plugins.LinkHandlerPlugin((url) =>
          linkhandler(url),
        );
        plugins.push(linkHandler);
      }

      if (catchlinks) {
        const catchEscapedLinks = new chemical.plugins.CatchEscapedLinksPlugin(
          (url) => catchlinks(url),
        );
        plugins.push(catchEscapedLinks);
      }

      if (adblock) {
        const adblocker = new chemical.plugins.AdblockPlugin({
          rawRulesets: [blacklistText],
          onBlock: (url, rule) => {
            console.log(`[AdBlock] Blocked ${url} matching rule: ${rule}`);
          },
        });
        plugins.push(adblocker);
      }

      frame = chemical.createFrame(frameRef, {
        plugins,
      });

      bindFrameEvents();

      if (src) {
        frame.go(src);
      }
    }
  });

  export function go(src, options = {}) {
    let autoHttps = options.autoHttps || false;
    let searchEngine = options.searchEngine;

    if (frame) {
      if (src.match(/^https?:\/\//)) {
        frame.go(src);
      } else if (
        autoHttps === true &&
        src.includes(".") &&
        !src.includes(" ")
      ) {
        frame.go("https://" + src);
      } else if (searchEngine) {
        frame.go(searchEngine.replace("%s", encodeURIComponent(src)));
      } else {
        frame.go(src);
      }
    }
  }

  export function reload() {
    frameRef.contentWindow.location.reload();
  }
  export function forward() {
    frameRef.contentWindow.history.forward();
  }
  export function back() {
    frameRef.contentWindow.history.back();
  }
  export function getTitle() {
    return frameRef.contentWindow.document.title;
  }
</script>

<iframe
  bind:this={frameRef}
  onload={handleLoad}
  class={className}
  {...restProps}
></iframe>
