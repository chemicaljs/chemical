<script>
  import { getContext } from "svelte";
  import Frame from "../Frame.svelte";

  let {
    cache = false,
    adblock = undefined,
    plugins = [],
    linkhandler = undefined,
    catchlinks = undefined,
    onpointerdown = undefined,
    onkeydown = undefined,
    onload = undefined,
    ...restProps
  } = $props();

  const ctx = getContext("chemical:tabs");

  function openInTab(url) {
    if (linkhandler) return linkhandler(url);
    const id = ctx.newTab(url ? String(url) : "");
    return {
      get closed() {
        return !ctx.list.some((t) => t.id === id);
      },
      close: () => ctx.close(id),
      focus: () => ctx.select(id),
      location: {
        get href() {
          return ctx.list.find((t) => t.id === id)?.url || "";
        },
        set href(next) {
          if (next) ctx.go(String(next), { id });
        },
      },
    };
  }
</script>

<div style:pointer-events={ctx.dragId ? "none" : undefined} {...restProps}>
  {#each ctx.frames as item (item.id)}
    <div
      style:display={item.id === ctx.activeId ? undefined : "none"}
      style="width:100%;height:100%"
      role="tabpanel"
      id={`chemical-panel-${item.id}`}
      aria-labelledby={`chemical-tab-${item.id}`}
      aria-hidden={item.id !== ctx.activeId}
    >
      <Frame
        bind:this={
          () => ctx.frameRefs[item.id],
          (ref) => {
            if (ref) ctx.frameRefs[item.id] = ref;
            else delete ctx.frameRefs[item.id];
          }
        }
        chemical={ctx.chemical}
        ready={ctx.ready}
        src={item.initialUrl}
        trackHistory={false}
        initialHistory={item.initialHistory}
        initialHistoryIndex={item.initialHistoryIndex}
        autoHttps
        searchEngine={ctx.searchEngine}
        {cache}
        {adblock}
        {plugins}
        {catchlinks}
        {onpointerdown}
        {onkeydown}
        {onload}
        onchange={(url, meta) => ctx.handleChange(item.id, url, meta)}
        ontitle={(title) => ctx.syncTitle(item.id, title)}
        onfavicon={(icon) => ctx.syncFavicon(item.id, icon)}
        linkhandler={openInTab}
      />
    </div>
  {/each}
</div>
