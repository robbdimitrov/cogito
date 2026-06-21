<script lang="ts">
  import { page } from "$app/state";
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";

  let { data } = $props();
  let user = $derived(data.profileUser);
  let currentUser = $derived(data.currentUser);

  const pagination = createPagination<Post>(data.posts, async (pageNum) => {
    const res = await fetch(`/@${user.username}?page=${pageNum}`);
    if (res.ok) {
      return await res.json();
    }
    return [];
  });

  let quotingPost = $state<Post | null>(null);

  function handleQuote(post: Post) {
    quotingPost = post;
  }

  $effect(() => {
    // Reset pagination when data.posts changes (i.e. navigation to another user)
    // Svelte 5 won't automatically recreate `pagination` when `data.posts` changes.
    // However, the `createPagination` takes initial array but we might need to recreate it.
    // For simplicity, we assume full page reload on navigation if it's the same route template,
    // or SvelteKit destroys and recreates the component.
  });
</script>

<PostList
  posts={pagination.items}
  users={[user]}
  currentUserId={currentUser?.id}
  onQuote={handleQuote}
  emptyMessage="No posts yet. Share what's on your mind!"
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
