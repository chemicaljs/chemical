<script>
  import { getContext } from "svelte";

  let { children, onclick = undefined, ...restProps } = $props();
  const ctx = getContext("chemical:tabs");
</script>

<button
  type="button"
  aria-label="New tab"
  style:pointer-events={ctx.dragId ? "none" : undefined}
  onclick={(e) => {
    ctx.newTab();
    onclick?.(e);
  }}
  {...restProps}
>
  {@render children?.()}
</button>

<style>
  button {
    flex-shrink: 0;
  }
</style>
