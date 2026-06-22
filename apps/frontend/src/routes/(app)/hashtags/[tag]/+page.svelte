<script lang="ts">
  import { page } from "$app/state";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";

  let { data } = $props();
  let tag = $derived(data.tag);
  let currentUser = $derived(data.currentUser);

  const pagination = createPagination<Post>(
    () => data.posts,
    async (cursor) => {
      const res = await fetch(
        `/hashtags/${tag}?cursor=${encodeURIComponent(cursor)}`,
      );
      return res.ok ? res.json() : { items: [], nextCursor: null };
    },
  );

  let quotingPost = $state<Post | null>(null);

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>#{tag} - Thoughts</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
  <div
    class="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800"
  >
    <h1
      class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
    >
      <span class="text-primary">#</span>{tag}
    </h1>
  </div>

  <PostList
    posts={pagination.items}
    users={[]}
    currentUserId={currentUser?.id}
    onQuote={handleQuote}
    emptyMessage="No posts with this hashtag yet."
  />

  {#if !pagination.done}
    <div class="py-4 text-center">
      <button
        type="button"
        class="btn btn-outline btn-sm"
        disabled={pagination.loading}
        onclick={() => pagination.more()}
      >
        {#if pagination.loading}
          <span class="loading loading-spinner loading-xs"></span>
        {:else}
          Load more
        {/if}
      </button>
    </div>
  {/if}

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
