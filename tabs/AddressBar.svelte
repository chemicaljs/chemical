<script>
  import { getContext } from "svelte";

  let {
    onkeydown = undefined,
    onfocus = undefined,
    onblur = undefined,
    oninput = undefined,
    onmouseup = undefined,
    ...restProps
  } = $props();

  const ctx = getContext("chemical:tabs");

  let inputEl = $state();
  let value = $state("");
  let selectOnUp = false;
  let lastActiveId;

  let displayValue = $derived(ctx.address.preview ?? value);

  $effect(() => {
    const activeId = ctx.activeId;
    const url = ctx.activeTab?.url ?? "";
    const switched = activeId !== lastActiveId;
    lastActiveId = activeId;

    if (switched || document.activeElement !== inputEl) {
      value = url;
      ctx.address.open = false;
      ctx.address.preview = null;
    }
  });

  $effect(() =>
    ctx.registerAddressBar({
      focus() {
        inputEl?.focus();
      },
      fill(next) {
        value = next;
        ctx.address.query = next;
        ctx.address.open = false;
        ctx.address.preview = null;
        inputEl?.focus();
        inputEl?.select();
      },
      blur: () => inputEl?.blur(),
    }),
  );

  function handleKeydown(e) {
    if (ctx.autocomplete?.handleKeydown(e)) {
      onkeydown?.(e);
      return;
    }

    if (e.key === "Escape") {
      value = ctx.activeTab?.url ?? "";
      ctx.address.open = false;
      ctx.address.preview = null;
      e.currentTarget.blur();
    } else if (e.key === "Enter") {
      ctx.address.open = false;
      ctx.address.preview = null;
      ctx.go(displayValue);
      e.currentTarget.blur();
    }

    onkeydown?.(e);
  }
</script>

<input
  bind:this={inputEl}
  type="text"
  autocomplete="off"
  spellcheck="false"
  role="combobox"
  aria-autocomplete="list"
  aria-expanded={ctx.autocomplete?.isOpen() ?? false}
  value={displayValue}
  onfocus={(e) => {
    selectOnUp = true;
    e.currentTarget.select();
    onfocus?.(e);
  }}
  onmouseup={(e) => {
    if (selectOnUp) {
      selectOnUp = false;
      e.preventDefault();
    }
    onmouseup?.(e);
  }}
  onblur={(e) => {
    selectOnUp = false;
    ctx.address.open = false;
    ctx.address.preview = null;
    onblur?.(e);
  }}
  oninput={(e) => {
    selectOnUp = false;
    value = e.currentTarget.value;
    ctx.address.query = value;
    ctx.address.preview = null;
    ctx.address.open = value.trim().length > 0;
    oninput?.(e);
  }}
  onkeydown={handleKeydown}
  {...restProps}
/>
