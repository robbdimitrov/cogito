<script lang="ts">
  import { page } from "$app/state";
  import UserCard from "$lib/domains/users/components/UserCard.svelte";
  import CreatePost from "$lib/domains/posts/components/CreatePost.svelte";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";

  let { data } = $props();
  let user = $derived(data.currentUser);

  const pagination = createPagination<Post>(data.feed, async (pageNum) => {
    const res = await fetch(`/?page=${pageNum}`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  });

  let quotingPost = $state<Post | null>(null);

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>Thoughts</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6">
  <div
    class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8"
  >
    <aside class="hidden lg:block">
      {#if user}
        <UserCard {user} />
      {/if}
    </aside>
    <section
      class="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:gap-4 lg:mx-0"
    >
      {#if user}
        <div class="lg:hidden">
          <UserCard {user} variant="compact" />
        </div>
        <CreatePost {user} />
      {/if}
      <PostList
        posts={pagination.items}
        users={user ? [user] : []}
        currentUserId={user?.id}
        onQuote={handleQuote}
        emptyMessage="No posts yet. Be the first to share!"
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
    </section>
  </div>

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
