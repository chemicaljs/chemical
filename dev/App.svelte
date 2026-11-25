<script>
  import Chemical from "chemicaljs/Chemical";
  import {
    AddressBar,
    Autocomplete,
    NewTab,
    Tab,
    TabBar,
    TabClose,
    TabFavicon,
    TabFrame,
    Tabs,
    TabTitle,
  } from "chemicaljs/tabs";

  let chemical = $state();
  let ready = $state(false);
  let tabs = $state();
  let orientation = $state("horizontal");
</script>

<Chemical bind:this={chemical} bind:ready />

<div class="browser" data-orientation={orientation}>
  <Tabs bind:this={tabs} {chemical} {ready} persist>
    <TabBar class="tab-bar" {orientation}>
      <Tab class="tab">
        <TabFavicon class="favicon">🌐</TabFavicon>
        <TabTitle class="title" />
        <TabClose class="close">✕</TabClose>
      </Tab>
      <NewTab class="new-tab">+</NewTab>
    </TabBar>

    <div class="main">
      <div class="toolbar">
        <button
          type="button"
          onclick={() => tabs.back()}
          disabled={!tabs?.canBack()}
          aria-label="Back"
        >
          ‹
        </button>
        <button
          type="button"
          onclick={() => tabs.forward()}
          disabled={!tabs?.canForward()}
          aria-label="Forward"
        >
          ›
        </button>
        <button
          type="button"
          onclick={() => tabs.reload()}
          disabled={!tabs?.getActiveTab()?.url}
          aria-label="Reload"
        >
          ↻
        </button>

        <div class="address-wrap">
          <AddressBar class="address" placeholder="Search or enter URL" />
          <Autocomplete class="suggestions" />
        </div>

        <button
          type="button"
          onclick={() =>
            (orientation =
              orientation === "vertical" ? "horizontal" : "vertical")}
          aria-label="Toggle tab orientation"
          title="Toggle tab orientation"
        >
          {orientation === "vertical" ? "⬒" : "◧"}
        </button>
        <button
          type="button"
          onclick={() => tabs.togglePin()}
          aria-label="Pin active tab"
          title="Pin active tab"
        >
          📌
        </button>
      </div>

      <TabFrame class="viewport" />
    </div>
  </Tabs>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    color-scheme: dark;
    background: #1e1e1e;
    color: #e8eaed;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    font-size: 13px;
  }

  .browser {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }

  .browser[data-orientation="vertical"] {
    flex-direction: row;
  }

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .browser :global(.tab-bar) {
    gap: 4px;
    padding: 6px;
    background: #1f2020;
  }

  .browser :global(.tab-bar[data-orientation="vertical"]) {
    width: 220px;
    flex-shrink: 0;
    border-right: 1px solid #333;
  }

  .browser :global(.tab) {
    gap: 6px;
    height: 32px;
    padding: 0 8px;
    border-radius: 10px;
    background: transparent;
    color: #9aa0a6;
    font-size: 12px;
    cursor: default;
  }

  .browser :global(.tab:hover) {
    background: #474747;
  }

  .browser :global(.tab[data-active]) {
    background: #3c3c3c;
    color: #e8eaed;
  }

  .browser :global(.tab-bar[data-orientation="vertical"] .tab[data-pinned]) {
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .browser :global(.favicon) {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    border-radius: 2px;
  }

  .browser :global(.close) {
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font-size: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    cursor: pointer;
  }

  .browser :global(.close:hover) {
    opacity: 1;
    background: rgba(255, 255, 255, 0.14);
  }

  .browser :global(.new-tab) {
    width: 28px;
    height: 28px;
    align-self: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #9aa0a6;
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .browser :global(.new-tab:hover) {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaed;
  }

  .browser :global(.tab-bar[data-orientation="vertical"] .new-tab) {
    width: 100%;
    height: 32px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    color: #c7c7c7;
  }

  .browser :global(.tab-bar[data-orientation="vertical"] .new-tab:hover) {
    background: rgba(255, 255, 255, 0.12);
    color: #e8eaed;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: #3c3c3c;
    border-bottom: 1px solid #444746;
  }

  .toolbar button {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #9aa0a6;
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .toolbar button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e8eaed;
  }

  .toolbar button:disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
  }

  .address-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    margin: 0 4px;
  }

  .address-wrap :global(.address) {
    flex: 1;
    min-width: 0;
    height: 30px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: #282828;
    color: #ffffff;
    font: inherit;
    outline: none;
  }

  .address-wrap :global(.address::placeholder) {
    color: #8e9196;
  }

  .address-wrap :global(.address:focus) {
    background: #2e2e2e;
    border-color: #8ab4f8;
  }

  .address-wrap :global(.suggestions) {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 60vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px;
    border: 1px solid #3f3f3f;
    border-radius: 12px;
    background: #252525;
    color: #e8eaed;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }

  .address-wrap :global(.suggestions li) {
    gap: 10px;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }

  .address-wrap :global(.suggestions li > *) {
    min-width: 0;
  }

  .address-wrap :global(.suggestions li:hover) {
    background: rgba(255, 255, 255, 0.06);
  }

  .address-wrap :global(.suggestions li[data-active]) {
    background: rgba(255, 255, 255, 0.11);
  }

  .address-wrap :global(.suggestions [data-ac-image]) {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    object-fit: cover;
    background: #333;
  }

  .address-wrap :global(.suggestions [data-ac-title]) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .address-wrap :global(.suggestions [data-ac-description]) {
    font-size: 11px;
    color: #9aa0a6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .address-wrap :global(.suggestions [data-ac-result]) {
    flex-shrink: 0;
    margin-left: auto;
    color: #8ab4f8;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .browser :global(.viewport) {
    flex: 1;
    min-height: 0;
    background: #3c3c3c;
  }

  .browser :global(.viewport iframe) {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
  }
</style>
