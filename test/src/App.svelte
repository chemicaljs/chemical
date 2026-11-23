<script>
  import Chemical from "../../Chemical.svelte";
  import Frame from "../../Frame.svelte";
  import searchEngines from "../../searchEngines.js";

  let transport = $state("epoxy");
  let wisp = $state(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`,
  );

  let chemical = $state();
  let frame = $state();
  let ready = $state(false);
  let url = $state("https://example.com");


  const plugins = $derived(
    ready && chemical?.plugins?.LinkHandlerPlugin
      ? [
          new chemical.plugins.EventHandlerPlugin(),
          new chemical.plugins.LinkHandlerPlugin((url) => console.log(url)),
        ]
      : []
  );

  function go(event) {
    event.preventDefault();
    frame.go(url, { autoHttps: true, searchEngine: searchEngines.google });
  }
</script>

<Chemical bind:this={chemical} bind:ready {transport} {wisp} />

<main>
  <h1>Chemical</h1>

  <form onsubmit={go}>
    <input bind:value={url} aria-label="URL" />
    <button type="submit" disabled={!ready}>Go</button>
  </form>

  <Frame {plugins} bind:this={frame} {ready} {chemical} bind:src={url} class="frame" />
</main>
