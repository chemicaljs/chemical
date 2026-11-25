<script>
  let {
    url,
    path,
    searchParams,
    go,
    openTab,
    reload,
    setTitle,
    getHistory,
    removeHistory,
    clearHistory,
  } = $props();

  let queryEntries = $derived([...searchParams.entries()]);
  let history = $derived(getHistory());
</script>

<div class="about">
  <div class="card">
    <h1>About Chemical</h1>
    <p class="meta">
      <code>{url}</code>
      <span>path: <code>{path}</code></span>
    </p>

    {#if queryEntries.length}
      <div class="params">
        {#each queryEntries as [key, value]}
          <span><code>{key}={value}</code></span>
        {/each}
      </div>
    {/if}

    <div class="actions">
      <button type="button" onclick={() => go("https://example.com")}>
        Go to example.com
      </button>
      <button type="button" onclick={() => openTab("https://example.com")}>
        Open in new tab
      </button>
      <button type="button" onclick={() => go("internal://about?test=1")}>
        Add query param
      </button>
      <button type="button" onclick={() => go("internal://missing")}>
        Test 404 fallback
      </button>
      <button type="button" onclick={() => setTitle("About (Updated)")}>
        Update title
      </button>
      <button type="button" onclick={() => reload()}>Reload</button>
    </div>
  </div>

  <div class="card">
    <div class="section-head">
      <h2>History ({history.length})</h2>
      {#if history.length}
        <button type="button" onclick={() => clearHistory()}>Clear all</button>
      {/if}
    </div>

    {#if history.length}
      <ul class="history">
        {#each history as entry (entry.id)}
          <li>
            <button type="button" class="entry" onclick={() => go(entry.url)}>
              {#if entry.favicon}
                <img src={entry.favicon} alt="" />
              {/if}
              <span class="entry-title">{entry.title}</span>
              <span class="entry-url">{entry.url}</span>
            </button>
            <button
              type="button"
              class="remove"
              aria-label="Remove history entry"
              onclick={() => removeHistory(entry.id)}
            >
              ✕
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">No history entries yet.</p>
    {/if}
  </div>
</div>

<style>
  .about {
    min-height: 100%;
    padding: 32px 24px;
    background: #1e1e1e;
    color: #e8eaed;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
    margin: 0 auto;
  }

  .card {
    padding: 20px;
    border: 1px solid #333;
    border-radius: 12px;
    background: #252525;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h1,
  h2 {
    margin: 0;
    font-weight: 600;
  }

  h1 {
    font-size: 20px;
  }

  h2 {
    font-size: 14px;
  }

  .meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: #9aa0a6;
    font-size: 12px;
  }

  .params {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  code {
    padding: 2px 6px;
    border-radius: 6px;
    background: #333;
    color: #8ab4f8;
    font-size: 12px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  button {
    padding: 6px 12px;
    border: 1px solid #3f3f3f;
    border-radius: 8px;
    background: #2f2f2f;
    color: #e8eaed;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  button:hover {
    background: #3c3c3c;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .history li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .entry {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    border-color: transparent;
    background: transparent;
  }

  .entry img {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border-radius: 2px;
  }

  .entry-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-url {
    margin-left: auto;
    color: #9aa0a6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 50%;
  }

  .remove {
    padding: 4px 8px;
    border-color: transparent;
    background: transparent;
    color: #9aa0a6;
  }

  .empty {
    margin: 0;
    color: #9aa0a6;
    font-size: 12px;
  }
</style>
