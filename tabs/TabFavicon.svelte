<script>
  import { getContext } from "svelte";

  let { children, ...restProps } = $props();
  const ctx = getContext("chemical:tabs");
  const tabCtx = getContext("chemical:tab");

  let failed = $state(false);

  $effect(() => {
    tabCtx.tab.favicon;
    ctx?.ready;
    failed = false;
  });
</script>

{#if tabCtx.tab.favicon && !failed}
  <img
    src={tabCtx.tab.favicon}
    alt=""
    draggable="false"
    onerror={() => (failed = true)}
    {...restProps}
  />
{:else if children}
  <span {...restProps}>{@render children()}</span>
{/if}

<style>
  :where(img, span) {
    flex-shrink: 0;
  }

  @container (max-width: 1.5rem) {
    :global([role="tab"]) img,
    :global([role="tab"]) span {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
    }
  }
</style>
