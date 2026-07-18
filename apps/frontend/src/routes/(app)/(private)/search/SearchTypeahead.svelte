<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { History, Search, X } from "@lucide/svelte";
  import { recordRecentSearch } from "$lib/shared/recentSearch";
  import SearchResultRow from "./SearchResultRow.svelte";
  import {
    interleaveSuggestions,
    type RecentSearchItem,
    type SuggestionItem,
  } from "./types";

  const SUGGEST_DISPLAY_LIMIT = 10;
  const DEBOUNCE_MS = 250;

  interface Props {
    query: string;
    currentUserId?: number | null;
    recent?: RecentSearchItem[];
  }

  let { query = $bindable(), currentUserId, recent = [] }: Props = $props();

  let items = $state<SuggestionItem[]>([]);
  let recentItems = $derived(recent);
  let open = $state(false);
  let inputFocused = $state(false);
  let activeIndex = $state(-1);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let abortController: AbortController | undefined;

  let showRecent = $derived(
    inputFocused && !query.trim() && recentItems.length > 0,
  );

  async function fetchSuggestions(q: string) {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    const prefix = q[0];
    const searchQuery = prefix === "@" || prefix === "#" ? q.slice(1) : q;
    if (!searchQuery) {
      items = [];
      open = false;
      return;
    }

    try {
      const wantUsers = prefix !== "#";
      const wantHashtags = prefix !== "@";
      const [usersRes, hashtagsRes] = await Promise.all([
        wantUsers
          ? fetch(
              `/search?${new URLSearchParams({
                q: searchQuery,
                type: "users",
                limit: String(SUGGEST_DISPLAY_LIMIT),
              })}`,
              { signal: controller.signal },
            )
          : null,
        wantHashtags
          ? fetch(
              `/search?${new URLSearchParams({
                q: searchQuery,
                type: "hashtags",
                limit: String(SUGGEST_DISPLAY_LIMIT),
              })}`,
              { signal: controller.signal },
            )
          : null,
      ]);
      const users = usersRes?.ok
        ? ((await usersRes.json()) as { items: SuggestionItem["item"][] }).items
        : [];
      const hashtags = hashtagsRes?.ok
        ? ((await hashtagsRes.json()) as { items: SuggestionItem["item"][] })
            .items
        : [];
      if (controller.signal.aborted) return;
      items = interleaveSuggestions(
        users as Extract<SuggestionItem, { type: "users" }>["item"][],
        hashtags as Extract<SuggestionItem, { type: "hashtags" }>["item"][],
        SUGGEST_DISPLAY_LIMIT,
      );
      open = items.length > 0;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        items = [];
        open = false;
      }
    }
  }

  function handleInput() {
    activeIndex = -1;
    clearTimeout(debounceTimer);
    const trimmed = query.trim();
    if (!trimmed) {
      abortController?.abort();
      items = [];
      open = false;
      return;
    }
    debounceTimer = setTimeout(() => fetchSuggestions(trimmed), DEBOUNCE_MS);
  }

  function handleFocus() {
    inputFocused = true;
    if (items.length > 0) open = true;
  }

  function handleFocusOut(e: FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) {
      inputFocused = false;
      open = false;
      activeIndex = -1;
    }
  }

  function recordSuggestion(item: SuggestionItem) {
    if (item.type === "users") {
      recordRecentSearch("users", item.item.username);
    } else {
      recordRecentSearch("hashtags", item.item.name);
    }
  }

  function navigateSuggestion(item: SuggestionItem | undefined) {
    if (!item) return;
    recordSuggestion(item);
    if (item.type === "users") {
      goto(resolve(`/@${item.item.username}`));
    } else {
      goto(
        resolve(`/search?${new URLSearchParams({ q: `#${item.item.name}` })}`),
      );
    }
    open = false;
  }

  function recordRecentItem(item: RecentSearchItem) {
    if (item.type === "users") recordRecentSearch("users", item.item.username);
    else if (item.type === "hashtags")
      recordRecentSearch("hashtags", item.item.name);
    else recordRecentSearch("queries", item.item);
  }

  async function removeRecent(id: string) {
    const previous = recentItems;
    recentItems = recentItems.filter((item) => item.id !== id);
    try {
      const res = await fetch(`/search/recent/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) recentItems = previous;
    } catch {
      recentItems = previous;
    }
  }

  async function clearRecent() {
    const previous = recentItems;
    recentItems = [];
    try {
      const res = await fetch("/search/recent", { method: "DELETE" });
      if (!res.ok) recentItems = previous;
    } catch {
      recentItems = previous;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      open = false;
      inputFocused = false;
      activeIndex = -1;
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateSuggestion(items[activeIndex]);
    }
  }
</script>

<div class="relative flex-1" onfocusout={handleFocusOut}>
  <label class="form-input flex items-center gap-2 rounded-2xl">
    <Search class="h-4 w-4 opacity-60" />
    <input
      type="search"
      placeholder="Search users, posts, hashtags..."
      bind:value={query}
      oninput={handleInput}
      onfocus={handleFocus}
      onkeydown={handleKeydown}
      role="combobox"
      aria-expanded={open || showRecent}
      aria-controls="search-typeahead-listbox"
      aria-autocomplete="list"
    />
  </label>

  {#if showRecent}
    <div
      class="dropdown-surface absolute top-full z-50 mt-2 w-full overflow-hidden"
    >
      <div class="flex items-center justify-between px-3 py-2">
        <h2
          class="text-xs font-semibold uppercase text-base-content opacity-60"
        >
          Recent
        </h2>
        <button
          type="button"
          class="text-xs font-semibold text-base-content opacity-60 hover:opacity-100"
          onclick={clearRecent}
        >
          Clear all
        </button>
      </div>
      <ul id="search-typeahead-listbox" class="max-h-96 overflow-y-auto py-1">
        {#each recentItems as item (item.id)}
          <li class="flex items-center gap-1 px-1">
            {#if item.type === "queries"}
              <a
                href={resolve(
                  `/search?${new URLSearchParams({ q: item.item })}`,
                )}
                class="min-w-0 flex-1"
                onmousedown={() => recordRecentItem(item)}
              >
                <span class="soft-surface flex items-center gap-3 p-4">
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-base-200"
                  >
                    <History class="h-5 w-5 opacity-60" />
                  </span>
                  <span class="truncate font-semibold text-base-content">
                    {item.item}
                  </span>
                </span>
              </a>
            {:else}
              <div class="min-w-0 flex-1">
                <SearchResultRow
                  result={item}
                  compact
                  {currentUserId}
                  onSelect={() => recordRecentItem(item)}
                />
              </div>
            {/if}
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base-content opacity-60 hover:bg-base-200 hover:opacity-100"
              aria-label="Remove from recent searches"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeRecent(item.id);
              }}
            >
              <X class="h-4 w-4" />
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if open}
    <div
      class="dropdown-surface absolute top-full z-50 mt-2 w-full overflow-hidden"
    >
      <ul id="search-typeahead-listbox" class="max-h-96 overflow-y-auto py-1">
        {#each items as item, i (item.type + "-" + i)}
          <li class={i === activeIndex ? "bg-base-200" : ""}>
            <SearchResultRow
              result={item}
              compact
              {currentUserId}
              onSelect={() => {
                recordSuggestion(item);
                open = false;
              }}
            />
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
