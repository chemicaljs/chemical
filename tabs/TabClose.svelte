<script>
  import { getContext } from "svelte";

  let { children, onclick = undefined, ...restProps } = $props();
  const tabCtx = getContext("chemical:tab");

  function handleClick(e) {
    e.stopPropagation();
    tabCtx.close();
    onclick?.(e);
  }
</script>

<button
  type="button"
  aria-label="Close tab"
  data-tab-close=""
  onclick={handleClick}
  {...restProps}
>
  {@render children?.()}
</button>

<style>
  :where(button) {
    line-height: 1;
  }

  :global([role="tab"]) button {
    flex-shrink: 0;
    margin-left: auto;
  }

  @container (max-width: 5.75rem) {
    :global([role="tab"]:not([data-active]):not(:hover)) button {
      display: none;
    }
  }

  @container (max-width: 3.25rem) {
    :global([role="tab"]:not([data-active])) button,
    :global([role="tab"][data-active]:not(:hover)) button,
    :global([role="tab"][data-dragging]) button {
      display: none;
    }

    :global([role="tab"][data-active]:hover:not([data-dragging])) button {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
    }
  }
</style>
