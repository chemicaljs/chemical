<script>
  import { setContext, tick } from "svelte";
  import searchEngines from "../searchEngines.js";

  const MAX_HISTORY = 500;

  let {
    chemical = undefined,
    ready = false,
    searchEngine = searchEngines.google,
    reorderable = true,
    persist = false,
    onchange = undefined,
    onopen = undefined,
    onclose = undefined,
    onreorder = undefined,
    onpin = undefined,
    children,
  } = $props();

  function isSameOrigin(url) {
    if (typeof location === "undefined") return false;
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return false;
    }
  }

  function isSafeUrl(url) {
    return typeof url === "string" && Boolean(url) && !isSameOrigin(url);
  }

  function createTab(
    url = "",
    title = "New Tab",
    favicon = "",
    pinned = false,
    id = crypto.randomUUID(),
  ) {
    return { id, title, url, favicon, pinned };
  }

  function getStorageKey() {
    if (persist === true) return "chemical:tabs";
    return typeof persist === "string" && persist ? persist : null;
  }

  function loadInitial() {
    const fallback = () => {
      const tab = createTab();
      return {
        list: [tab],
        frames: [{ id: tab.id, initialUrl: "" }],
        activeId: tab.id,
        history: [],
      };
    };

    const key = getStorageKey();
    if (!key || typeof localStorage === "undefined") return fallback();

    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      if (!Array.isArray(raw?.tabs) || !raw.tabs.length) return fallback();

      const seen = new Set();
      const loaded = [];
      const navById = new Map();

      for (const item of raw.tabs) {
        const id =
          typeof item?.id === "string" && item.id && !seen.has(item.id)
            ? item.id
            : crypto.randomUUID();
        seen.add(id);

        const url = isSafeUrl(item?.url) ? item.url : "";
        const rawHistory = Array.isArray(item?.history)
          ? item.history.filter((entry) => entry === "" || isSafeUrl(entry))
          : [];
        const initialHistory = rawHistory.length ? rawHistory : [url];
        const initialHistoryIndex =
          typeof item?.historyIndex === "number" &&
          item.historyIndex >= 0 &&
          item.historyIndex < initialHistory.length
            ? item.historyIndex
            : initialHistory.length - 1;

        loaded.push(
          createTab(
            url,
            url && typeof item?.title === "string" && item.title
              ? item.title
              : "New Tab",
            url && typeof item?.favicon === "string" ? item.favicon : "",
            Boolean(item?.pinned),
            id,
          ),
        );
        navById.set(id, { initialHistory, initialHistoryIndex });
      }

      if (!loaded.length) return fallback();

      const ordered = [
        ...loaded.filter((t) => t.pinned),
        ...loaded.filter((t) => !t.pinned),
      ];
      const savedActive = ordered.some((t) => t.id === raw.activeId)
        ? raw.activeId
        : ordered[0].id;
      const savedHistory = Array.isArray(raw.history)
        ? raw.history
            .filter((item) => isSafeUrl(item?.url))
            .slice(0, MAX_HISTORY)
            .map((item) => ({
              id:
                typeof item.id === "string" && item.id
                  ? item.id
                  : crypto.randomUUID(),
              url: item.url,
              title:
                typeof item.title === "string" && item.title
                  ? item.title
                  : item.url,
              favicon: typeof item.favicon === "string" ? item.favicon : "",
              timestamp:
                typeof item.timestamp === "number"
                  ? item.timestamp
                  : Date.now(),
            }))
        : [];

      return {
        list: ordered,
        frames: ordered.map((t) => ({
          id: t.id,
          initialUrl: t.url,
          ...navById.get(t.id),
        })),
        activeId: savedActive,
        history: savedHistory,
      };
    } catch {
      return fallback();
    }
  }

  const initial = loadInitial();
  let storageKey = $derived(getStorageKey());
  let list = $state(initial.list);
  let frames = $state(initial.frames);
  let activeId = $state(initial.activeId);
  let activeTab = $derived(list.find((t) => t.id === activeId));
  let history = $state(initial.history);
  let address = $state({ query: "", open: false, preview: null });
  let autocomplete = $state(null);
  let dragId = $state(null);

  let addressBar = null;
  const frameRefs = $state({});
  const tabHistoryEntry = {};

  $effect(() => {
    if (!storageKey || typeof localStorage === "undefined") return;
    const framesById = new Map(frames.map((f) => [f.id, f]));
    const payload = {
      activeId,
      tabs: list.map(({ id, title, url, favicon, pinned }) => {
        const nav = frameRefs[id]?.getNavState?.();
        const saved = framesById.get(id);
        const tabHistory = nav
          ? [...nav.history]
          : saved?.initialHistory
            ? [...saved.initialHistory]
            : [url];
        const tabHistoryIndex = nav
          ? nav.index
          : typeof saved?.initialHistoryIndex === "number"
            ? saved.initialHistoryIndex
            : tabHistory.length - 1;
        return {
          id,
          title,
          url,
          favicon,
          pinned: Boolean(pinned),
          history: tabHistory,
          historyIndex: tabHistoryIndex,
        };
      }),
      history: history.map(({ id, url, title, favicon, timestamp }) => ({
        id,
        url,
        title,
        favicon,
        timestamp,
      })),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            ...payload,
            tabs: payload.tabs.map((tab) => ({ ...tab, favicon: "" })),
            history: payload.history.map((entry) => ({
              ...entry,
              favicon: "",
            })),
          }),
        );
      } catch {}
    }
  });

  function recordHistory(id, url, favicon = "") {
    if (!url) {
      delete tabHistoryEntry[id];
      return;
    }

    const currentId = tabHistoryEntry[id];
    const existing = currentId
      ? history.find((entry) => entry.id === currentId)
      : null;
    if (existing && existing.url === url) {
      existing.timestamp = Date.now();
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      url,
      title: url,
      favicon,
      timestamp: Date.now(),
    };
    tabHistoryEntry[id] = entry.id;
    history = [entry, ...history].slice(0, MAX_HISTORY);
  }

  function updateHistoryEntry(id, patch) {
    const entryId = tabHistoryEntry[id];
    if (!entryId) return;
    const entry = history.find((item) => item.id === entryId);
    if (!entry) return;
    if (patch.title) entry.title = patch.title;
    if (patch.favicon !== undefined) entry.favicon = patch.favicon;
  }

  export function getHistory() {
    return history;
  }

  export function removeHistory(id) {
    history = history.filter((entry) => entry.id !== id);
    for (const [tabId, entryId] of Object.entries(tabHistoryEntry)) {
      if (entryId === id) delete tabHistoryEntry[tabId];
    }
  }

  export function clearHistory() {
    history = [];
    for (const tabId of Object.keys(tabHistoryEntry)) {
      delete tabHistoryEntry[tabId];
    }
  }

  export function newTab(
    url = "",
    { active = true, pinned = false, focus = !url } = {},
  ) {
    const raw = url ? String(url) : "";
    const initialUrl = raw && !isSameOrigin(raw) ? raw : "";
    const tab = createTab(initialUrl, "New Tab", "", Boolean(pinned));
    const idx = tab.pinned ? list.filter((t) => t.pinned).length : list.length;
    list = [...list.slice(0, idx), tab, ...list.slice(idx)];
    frames = [...frames, { id: tab.id, initialUrl }];
    if (active) {
      activeId = tab.id;
      if (focus) {
        tick().then(() => {
          if (activeId === tab.id) addressBar?.focus?.();
        });
      }
    }
    onopen?.({ id: tab.id });
    return tab.id;
  }

  export function duplicate(id = activeId) {
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const src = list[idx];
    const tab = createTab(
      src.url,
      src.title || "New Tab",
      src.favicon,
      src.pinned,
    );
    list = [...list.slice(0, idx + 1), tab, ...list.slice(idx + 1)];
    frames = [...frames, { id: tab.id, initialUrl: src.url }];
    activeId = tab.id;
    onopen?.({ id: tab.id });
    return tab.id;
  }

  function setPinned(id, pinned) {
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1 || list[idx].pinned === pinned) return;

    const tab = list[idx];
    tab.pinned = pinned;

    const rest = list.filter((t) => t.id !== id);
    const to = rest.filter((t) => t.pinned).length;
    list = [...rest.slice(0, to), tab, ...rest.slice(to)];
    onpin?.({ id, pinned });
  }

  export function pin(id = activeId) {
    setPinned(id, true);
  }

  export function unpin(id = activeId) {
    setPinned(id, false);
  }

  export function togglePin(id = activeId) {
    const tab = list.find((t) => t.id === id);
    if (tab) setPinned(id, !tab.pinned);
  }

  function removeTabs(ids) {
    if (!ids.length) return;
    const removed = new Set(ids);
    if (dragId && removed.has(dragId)) dragId = null;

    list = list.filter((t) => !removed.has(t.id));
    frames = frames.filter((f) => !removed.has(f.id));

    for (const id of ids) {
      delete frameRefs[id];
      delete tabHistoryEntry[id];
      onclose?.({ id });
    }
  }

  export function close(id = activeId) {
    if (list.length <= 1) return;
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    if (activeId === id) activeId = (list[idx + 1] ?? list[idx - 1]).id;
    removeTabs([id]);
  }

  export function closeOthers(id = activeId) {
    if (!list.some((t) => t.id === id)) return;
    activeId = id;
    removeTabs(list.filter((t) => t.id !== id && !t.pinned).map((t) => t.id));
  }

  export function closeToRight(id = activeId) {
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1 || idx >= list.length - 1) return;
    const ids = list
      .slice(idx + 1)
      .filter((t) => !t.pinned)
      .map((t) => t.id);
    if (!ids.length) return;
    if (ids.includes(activeId)) activeId = id;
    removeTabs(ids);
  }

  export function select(id) {
    if (list.some((t) => t.id === id)) activeId = id;
  }

  export function reorder(from, to) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= list.length ||
      to >= list.length ||
      Boolean(list[from].pinned) !== Boolean(list[to].pinned)
    ) {
      return;
    }

    const order = list.map((tab) => tab.id);
    const [id] = order.splice(from, 1);
    order.splice(to, 0, id);
    reconcileOrder(order, id);
  }

  function reconcileOrder(order, movedId) {
    const tabsById = new Map(list.map((tab) => [tab.id, tab]));
    if (order.length !== list.length || order.some((id) => !tabsById.has(id))) {
      return;
    }

    const from = list.findIndex((tab) => tab.id === movedId);
    const to = order.indexOf(movedId);
    if (from < 0 || to < 0) return;

    list = order.map((id) => tabsById.get(id));
    if (from !== to) onreorder?.({ id: movedId, from, to });
  }

  export function go(url, { id = activeId, ...options } = {}) {
    const ref = frameRefs[id];
    if (ref) {
      ref.go(url, { autoHttps: true, searchEngine, ...options });
    } else {
      const frame = frames.find((f) => f.id === id);
      if (frame) frame.initialUrl = String(url);
    }
  }

  export function reload(id = activeId) {
    frameRefs[id]?.reload();
  }

  export function canBack(id = activeId) {
    return Boolean(frameRefs[id]?.canBack?.());
  }

  export function canForward(id = activeId) {
    return Boolean(frameRefs[id]?.canForward?.());
  }

  export function back(id = activeId) {
    if (!canBack(id)) return false;
    delete tabHistoryEntry[id];
    return Boolean(frameRefs[id]?.back?.());
  }

  export function forward(id = activeId) {
    if (!canForward(id)) return false;
    delete tabHistoryEntry[id];
    return Boolean(frameRefs[id]?.forward?.());
  }

  export function reset(id = activeId) {
    delete tabHistoryEntry[id];
    const frame = frames.find((f) => f.id === id);
    if (frame) frame.initialUrl = "";
    frameRefs[id]?.reset();
    const tab = list.find((t) => t.id === id);
    if (tab) {
      tab.url = "";
      tab.title = "New Tab";
      tab.favicon = "";
      onchange?.("", tab);
    }
  }

  export function getTabs() {
    return list;
  }

  export function getActiveTab() {
    return activeTab;
  }

  export function getTitle() {
    return frameRefs[activeId]?.getTitle();
  }

  export function fullscreen() {
    return frameRefs[activeId]?.fullscreen();
  }

  function syncTitle(id, title) {
    const tab = list.find((t) => t.id === id);
    if (!tab) return;
    const next = title || (tab.url ? tab.title : "New Tab");
    if (tab.title !== next) tab.title = next;
    if (title) updateHistoryEntry(id, { title });
  }

  function syncFavicon(id, icon) {
    const tab = list.find((t) => t.id === id);
    if (!tab) return;
    tab.favicon = icon;
    if (icon) updateHistoryEntry(id, { favicon: icon });
  }

  function handleChange(id, url, meta) {
    const tab = list.find((t) => t.id === id);
    if (!tab) return;

    tab.url = url;
    if (!url) {
      tab.title = "New Tab";
      tab.favicon = "";
    }

    if (!meta?.fromHistory && meta?.recordHistory !== false) {
      recordHistory(id, url, tab.favicon);
    }

    onchange?.(url, tab);
  }

  setContext("chemical:tabs", {
    get list() {
      return list;
    },
    get frames() {
      return frames;
    },
    get activeId() {
      return activeId;
    },
    get activeTab() {
      return activeTab;
    },
    get history() {
      return history;
    },
    get address() {
      return address;
    },
    get autocomplete() {
      return autocomplete;
    },
    get dragId() {
      return dragId;
    },
    set dragId(value) {
      dragId = value;
    },
    get chemical() {
      return chemical;
    },
    get ready() {
      return ready;
    },
    get searchEngine() {
      return searchEngine;
    },
    get reorderable() {
      return reorderable;
    },
    frameRefs,
    newTab,
    duplicate,
    pin,
    unpin,
    togglePin,
    close,
    closeOthers,
    closeToRight,
    select,
    reorder,
    reconcileOrder,
    go,
    reload,
    canBack,
    canForward,
    back,
    forward,
    reset,
    getTabs,
    getHistory,
    removeHistory,
    clearHistory,
    getTitle,
    fullscreen,
    handleChange,
    syncTitle,
    syncFavicon,
    registerAddressBar(api) {
      addressBar = api;
      return () => {
        if (addressBar === api) addressBar = null;
      };
    },
    registerAutocomplete(api) {
      autocomplete = api;
      return () => {
        if (autocomplete === api) autocomplete = null;
      };
    },
    commitAddress(val, item) {
      address.open = false;
      address.preview = null;
      if (item?.type === "math") {
        addressBar?.fill(val);
        return;
      }
      go(val);
      addressBar?.blur();
    },
  });
</script>

{@render children?.()}
