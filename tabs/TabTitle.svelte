<script>
  import { getContext } from "svelte";

  let { ...restProps } = $props();
  const tabCtx = getContext("chemical:tab");
</script>

<span data-tab-title="" {...restProps}>{tabCtx.tab.title}</span>

<style>
  span {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    -webkit-mask-image: linear-gradient(
      to right,
      #000 calc(100% - 1rem),
      transparent
    );
    mask-image: linear-gradient(to right, #000 calc(100% - 1rem), transparent);
  }

  :where(span) {
    flex: 1 1 0;
  }

  span::after {
    content: "\200b";
  }

  @container (max-width: 1.5rem) {
    :global([role="tab"]) span {
      flex: 0 0 0;
      width: 0;
      margin: 0;
      padding: 0;
      border: 0;
      visibility: hidden;
      pointer-events: none;
    }
  }
</style>
