<script lang="ts">
  import { resolve } from "$app/paths";
  import UserCard from "$lib/domains/users/components/UserCard.svelte";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";
  import { Search } from "@lucide/svelte";

  let { data } = $props();
  let user = $derived(data.currentUser);

  const pagination = createPagination<Post>(
    () => data.feed,
    async (cursor) => {
      const res = await fetch(`/?cursor=${encodeURIComponent(cursor)}`);
      return res.ok ? res.json() : { items: [], nextCursor: null };
    },
  );

  let quotingPost = $state<Post | null>(null);

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

<svelte:head>
  <title>Cogito</title>
</svelte:head>

<main class="feed-shell">
  <div class="flex flex-col gap-3 sm:gap-4">
    {#if user}
      <UserCard {user} />
    {/if}
    {#if data.isEmpty}
      <GlassCard>
        <div class="card-body muted-text items-center py-12 text-center">
          <Search
            class="mb-2 size-12 text-base-content opacity-50"
            aria-hidden="true"
          />
          <p>No posts in your feed yet.</p>
          <a
            href={resolve("/search")}
            class="btn btn-primary btn-sm mt-2 rounded-full"
          >
            Find people to follow
          </a>
        </div>
      </GlassCard>
    {:else}
      <PostList
        posts={pagination.items}
        users={user ? [user] : []}
        currentUserId={user?.id}
        onQuote={handleQuote}
        emptyMessage="No posts yet. Be the first to share!"
      />
    {/if}
    {#if !pagination.done}
      <div class="py-4 text-center">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-full"
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
  </div>

  {#if quotingPost}
    <QuoteComposeModal
      quotedPost={quotingPost}
      onClose={() => (quotingPost = null)}
    />
  {/if}
</main>
