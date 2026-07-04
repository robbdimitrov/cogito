<script lang="ts">
  import { resolve } from "$app/paths";
  import UserCard from "$lib/domains/users/components/UserCard.svelte";
  import CreatePost from "$lib/domains/posts/components/CreatePost.svelte";
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
      {#if data.isEmpty}
        <GlassCard>
          <div
            class="card-body items-center py-12 text-center text-slate-600 dark:text-slate-300"
          >
            <Search class="mb-2 h-12 w-12 opacity-50" aria-hidden="true" />
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
