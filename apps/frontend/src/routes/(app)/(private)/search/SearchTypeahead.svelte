<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Search } from "@lucide/svelte";
  import SearchResultRow from "./SearchResultRow.svelte";
  import type { BlendedItem } from "./types";

  const SUGGEST_DISPLAY_LIMIT = 8;
  const DEBOUNCE_MS = 250;
  const BLUR_CLOSE_DELAY_MS = 150;

  interface Props {
    query: string;
    currentUserId?: number | null;
  }

  let { query = $bindable(), currentUserId }: Props = $props();

  let items = $state<BlendedItem[]>([]);
  let open = $state(false);
  let activeIndex = $state(-1);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let abortController: AbortController | undefined;

  async function fetchSuggestions(q: string) {
    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;

    const params = new URLSearchParams({
      q,
      type: "all",
      limit: String(SUGGEST_DISPLAY_LIMIT),
    });
    try {
      const res = await fetch(`/search?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        items = [];
        open = false;
        return;
      }
      const data = (await res.json()) as { items: BlendedItem[] };
      items = data.items;
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
    if (items.length > 0) open = true;
  }

  function handleBlur() {
    setTimeout(() => {
      open = false;
      activeIndex = -1;
    }, BLUR_CLOSE_DELAY_MS);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const selected = items[activeIndex];
      if (selected?.type === "users") {
        goto(resolve(`/@${selected.item.username}`));
      } else if (selected?.type === "hashtags") {
        goto(resolve(`/hashtags/${selected.item.name}`));
      } else if (selected) {
        goto(resolve(`/posts/${selected.item.id}`));
      }
      open = false;
    } else if (e.key === "Escape") {
      open = false;
      activeIndex = -1;
    }
  }
</script>

<div class="relative flex-1">
  <label class="input input-bordered flex items-center gap-2 rounded-2xl">
    <Search class="h-4 w-4 opacity-60" />
    <input
      type="search"
      placeholder="Search users, posts, hashtags..."
      bind:value={query}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      role="combobox"
      aria-expanded={open}
      aria-controls="search-typeahead-listbox"
      aria-autocomplete="list"
    />
  </label>

  {#if open}
    <div
      class="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul id="search-typeahead-listbox" class="max-h-96 overflow-y-auto py-1">
        {#each items as item, i (item.type + "-" + i)}
          <li class={i === activeIndex ? "bg-slate-100 dark:bg-slate-800/80" : ""}>
            <SearchResultRow result={item} compact {currentUserId} />
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
