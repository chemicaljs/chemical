<script>
  import { setContext } from "svelte";

  let { orientation = "horizontal", children, ...restProps } = $props();

  setContext("chemical:tabbar", {
    get orientation() {
      return orientation;
    },
  });
</script>

<div
  role="tablist"
  aria-orientation={orientation}
  data-orientation={orientation}
  {...restProps}
>
  {@render children?.()}
</div>

<style>
  div {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  div[data-orientation="vertical"] {
    min-height: 0;
    max-height: 100%;
  }

  :where(div) {
    display: flex;
    flex-direction: row;
    align-items: stretch;
  }

  :where(div[data-orientation="vertical"]) {
    flex-direction: column;
  }
</style>
