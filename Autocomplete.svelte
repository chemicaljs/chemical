<script>
  import { getContext } from "svelte";

  function defaultGetValue(entry) {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return "";
    if (entry.type === "plain") {
      return entry.fullURL ?? entry.data?.map((p) => p.text).join("") ?? "";
    }
    if (entry.type === "rich") return entry.data?.title ?? "";
    if (entry.type === "math") return entry.data?.result ?? "";
    return entry.value ?? entry.label ?? entry.title ?? "";
  }

  let {
    chemical = undefined,
    ready = undefined,
    search = undefined,
    query = undefined,
    open = undefined,
    debounce = 150,
    limit = 8,
    getValue = defaultGetValue,
    onselect = undefined,
    onhighlight = undefined,
    item: itemSnippet = undefined,
    ...restProps
  } = $props();

  const tabsCtx = getContext("chemical:tabs");
  let boundToTabs = $derived(Boolean(tabsCtx) && query === undefined);

  let items = $state([]);
  let activeIndex = $state(-1);
  let dismissed = $state(false);
  let runId = 0;

  let resolvedChemical = $derived(chemical ?? tabsCtx?.chemical);
  let resolvedReady = $derived(ready ?? tabsCtx?.ready ?? true);
  let resolvedQuery = $derived(query ?? tabsCtx?.address.query ?? "");
  let resolvedOpen = $derived(
    open ?? (boundToTabs ? tabsCtx.address.open : true),
  );
  let visible = $derived(resolvedOpen && !dismissed && items.length > 0);

  $effect(() => {
    const q = resolvedQuery;
    const isOpen = resolvedOpen;
    const isReady = resolvedReady;
    const customSearch = search;
    const chem = resolvedChemical;
    const maxItems = limit;

    dismissed = false;
    activeIndex = -1;

    if (!isOpen || !q.trim()) {
      runId++;
      items = [];
      return;
    }

    if (!customSearch && (!isReady || !chem?.autocomplete)) {
      return;
    }

    const currentRun = ++runId;
    const timer = setTimeout(async () => {
      try {
        const result = customSearch
          ? await customSearch(q)
          : await chem.autocomplete(q);
        if (currentRun !== runId) return;
        const arr = Array.isArray(result) ? result : [];
        items = maxItems > 0 ? arr.slice(0, maxItems) : arr;
        activeIndex = -1;
      } catch (err) {
        console.error("Autocomplete failed:", err);
        if (currentRun === runId) items = [];
      }
    }, debounce);

    return () => clearTimeout(timer);
  });

  export function isOpen() {
    return visible;
  }

  export function move(delta) {
    if (!visible || !items.length) return;
    const len = items.length;
    if (activeIndex === -1) {
      activeIndex = delta > 0 ? 0 : len - 1;
    } else {
      const next = activeIndex + delta;
      activeIndex = next < 0 || next >= len ? -1 : next;
    }

    const entry = activeIndex >= 0 ? items[activeIndex] : null;
    const val = entry ? getValue(entry) : null;
    if (boundToTabs) tabsCtx.address.preview = val;
    onhighlight?.(val, entry, activeIndex);
  }

  export function select(index = activeIndex) {
    if (index < 0 || index >= items.length) return false;
    const entry = items[index];
    const val = getValue(entry);

    activeIndex = -1;
    dismissed = true;
    items = [];

    if (onselect) {
      onselect(val, entry);
    } else if (boundToTabs) {
      tabsCtx.commitAddress(val, entry);
    }
    return true;
  }

  export function selectActive() {
    return activeIndex >= 0 ? select(activeIndex) : false;
  }

  export function close() {
    activeIndex = -1;
    dismissed = true;
    if (boundToTabs) {
      tabsCtx.address.open = false;
      tabsCtx.address.preview = null;
    }
  }

  export function handleKeydown(e) {
    if (!visible) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
      return true;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectActive();
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  }

  $effect(() => {
    if (!boundToTabs) return;
    return tabsCtx.registerAutocomplete({
      isOpen,
      move,
      select,
      selectActive,
      close,
      handleKeydown,
    });
  });
</script>

{#if visible}
  <ul role="listbox" {...restProps}>
    {#each items as entry, i}
      {@const val = getValue(entry)}
      {@const active = i === activeIndex}
      <li
        role="option"
        aria-selected={active}
        data-active={active || undefined}
        data-type={entry?.type || undefined}
        onpointerdown={(e) => {
          e.preventDefault();
          select(i);
        }}
      >
        {#if itemSnippet}
          {@render itemSnippet({
            item: entry,
            value: val,
            active,
            index: i,
            select: () => select(i),
          })}
        {:else if entry?.type === "math"}
          <span data-ac-equation="">{entry.data.equation}</span>
          <span data-ac-result="">= {entry.data.result}</span>
        {:else if entry?.type === "rich"}
          {#if entry.data.image}
            <img src={entry.data.image} alt="" data-ac-image="" />
          {/if}
          <span data-ac-text="">
            <span data-ac-title="">{entry.data.title}</span>
            {#if entry.data.description}
              <span data-ac-description="">{entry.data.description}</span>
            {/if}
          </span>
        {:else if entry?.type === "plain"}
          <span data-ac-plain="">
            {#each entry.data as part}
              {#if part.highlight}
                <b>{part.text}</b>
              {:else}
                {part.text}
              {/if}
            {/each}
          </span>
        {:else}
          <span>{val}</span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  :where(ul) {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  :where(li) {
    display: flex;
    align-items: center;
    cursor: default;
    user-select: none;
  }

  :where([data-ac-text]) {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  :where([data-ac-image]) {
    flex-shrink: 0;
  }
</style>
