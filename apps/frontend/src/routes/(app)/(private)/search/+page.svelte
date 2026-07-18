<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
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

  let { data } = $props();

  let q = $derived(data.q);
  let searchInput = $derived(data.q);
  let currentUser = $derived(data.currentUser);
  let quotingPost = $state<Post | null>(null);

  const EMPTY_POSTS = { items: [] as Post[], nextCursor: null };

  const hashtagPostsPagination = createPagination<Post>(
    () => (data.type === "hashtag-posts" ? data.results : EMPTY_POSTS),
    async (cursor) => {
      const params = new URLSearchParams({
        q,
        type: "hashtag-posts",
        cursor,
      });
      const res = await fetch(`/search?${params}`);
      return res.ok ? res.json() : EMPTY_POSTS;
    },
  );

  async function fetchResults(
    cursor: string,
  ): Promise<{ items: BlendedItem[]; nextCursor: string | null }> {
    if (data.type === "hashtag-posts") return { items: [], nextCursor: null };
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
      items: wrapBlended("users", payload.items as User[]),
      nextCursor: payload.nextCursor,
    };
  }

  const EMPTY_SECTION = { items: [] as BlendedItem[], nextCursor: null };

  const resultsPagination = createPagination<BlendedItem>(
    () => (data.type === "hashtag-posts" ? EMPTY_SECTION : data.results),
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
  <title
    >{data.type === "hashtag-posts"
      ? `#${data.tag}`
      : q
        ? `${q} - Search`
        : "Search"} - Cogito</title
  >
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

  {#if data.type === "hashtag-posts"}
    <div
      class="subtle-border mb-6 flex items-center justify-between border-b pb-4"
    >
      <h1
        class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl"
      >
        <span class="text-primary">#</span>{data.tag}
      </h1>
    </div>

    <PostList
      posts={hashtagPostsPagination.items}
      users={[]}
      currentUserId={currentUser?.id}
      onQuote={handleQuote}
      emptyMessage="No posts with this hashtag yet."
    />

    {#if !hashtagPostsPagination.done}
      <div class="py-4 text-center">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-full"
          disabled={hashtagPostsPagination.loading}
          onclick={() => hashtagPostsPagination.more()}
        >
          {#if hashtagPostsPagination.loading}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            Load more
          {/if}
        </button>
      </div>
    {/if}
  {:else if !q}
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
