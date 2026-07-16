<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import { recordRecentSearch } from "$lib/shared/recentSearch";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import { Search } from "@lucide/svelte";
  import SearchResultRow from "./SearchResultRow.svelte";
  import SearchTypeahead from "./SearchTypeahead.svelte";
  import { wrapBlended, type BlendedItem } from "./types";
  import type { Post } from "$lib/domains/posts/model";
  import type { User } from "$lib/domains/users/model";
  import type { Hashtag } from "$lib/domains/posts/api.server";

  let { data } = $props();

  let q = $derived(data.q);
  let searchInput = $derived(data.q);
  let quotingPost = $state<Post | null>(null);

  async function fetchResults(
    cursor: string,
  ): Promise<{ items: BlendedItem[]; nextCursor: string | null }> {
    const params = new URLSearchParams({ q, type: data.type, cursor });
    const res = await fetch(`/search?${params}`);
    if (!res.ok) return { items: [], nextCursor: null };
    const payload = (await res.json()) as {
      items: unknown[];
      nextCursor: string | null;
    };
    if (data.type === "all") {
      return payload as { items: BlendedItem[]; nextCursor: string | null };
    }
    return {
      items: wrapBlended(data.type, payload.items as (User | Hashtag)[]),
      nextCursor: payload.nextCursor,
    };
  }

  const resultsPagination = createPagination<BlendedItem>(
    () => data.results,
    fetchResults,
  );

  function resultKey(result: BlendedItem): string {
    if (result.type === "users") return `users-${result.item.username}`;
    if (result.type === "hashtags") return `hashtags-${result.item.name}`;
    return `posts-${result.item.id}`;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    recordRecentSearch("queries", trimmed);
    goto(resolve(`/search?${new URLSearchParams({ q: trimmed })}`));
  }

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>{q ? `${q} - Search` : "Search"} - Cogito</title>
</svelte:head>

<main class="feed-shell">
  <form onsubmit={handleSubmit} class="mb-6">
    <div class="flex gap-2">
      <SearchTypeahead
        bind:query={searchInput}
        currentUserId={data.currentUser?.id}
        recent={data.recent}
      />
      <button type="submit" class="btn btn-primary rounded-2xl">Search</button>
    </div>
  </form>

  {#if !q}
    <GlassCard>
      <div class="card-body muted-text items-center py-12 text-center">
        <Search class="mb-2 h-12 w-12 text-base-content opacity-50" />
        <p>Enter a search query to find posts, people, and hashtags.</p>
      </div>
    </GlassCard>
  {:else if resultsPagination.items.length === 0}
    <GlassCard>
      <div class="card-body muted-text items-center py-12 text-center">
        <Search class="mb-2 h-12 w-12 text-base-content opacity-50" />
        <p>No results found for "{q}".</p>
      </div>
    </GlassCard>
  {:else}
    <ul class="space-y-3">
      {#each resultsPagination.items as result (resultKey(result))}
        <SearchResultRow
          {result}
          currentUserId={data.currentUser?.id}
          onQuote={handleQuote}
        />
      {/each}
    </ul>
    {#if !resultsPagination.done}
      <div class="mt-4 flex justify-center">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-full"
          disabled={resultsPagination.loading}
          onclick={() => resultsPagination.more()}
        >
          {resultsPagination.loading ? "Loading..." : "Load more"}
        </button>
      </div>
    {/if}
  {/if}

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
