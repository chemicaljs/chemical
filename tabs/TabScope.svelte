<script>
  import { getContext, setContext } from "svelte";

  let { tab, children } = $props();
  const ctx = getContext("chemical:tabs");

  setContext("chemical:tab", {
    get tab() {
      return tab;
    },
    get active() {
      return ctx.activeId === tab.id;
    },
    get pinned() {
      return Boolean(tab.pinned);
    },
    close: () => ctx.close(tab.id),
    pin: () => ctx.pin(tab.id),
    unpin: () => ctx.unpin(tab.id),
    togglePin: () => ctx.togglePin(tab.id),
  });
</script>

{@render children?.(tab)}
