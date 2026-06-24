<script lang="ts">
  import PostList from "$lib/domains/posts/components/PostList.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import UserList from "$lib/domains/users/components/UserList.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Post } from "$lib/domains/posts/model";
  import type { User } from "$lib/domains/users/model";

  let { data } = $props();
  let user = $derived(data.profileUser);
  let currentUser = $derived(data.currentUser);

  let tab = $derived(data.tab);
  let isPosts = $derived(data.type === "posts");

  const pagination = createPagination<Post | User>(
    () => ({ items: data.items, nextCursor: data.nextCursor }),
    async (cursor) => {
      const res = await fetch(
        `/@${user.username}/${tab}?cursor=${encodeURIComponent(cursor)}`,
      );
      return res.ok ? res.json() : { items: [], nextCursor: null };
    },
  );

  let quotingPost = $state<Post | null>(null);

  function handleQuote(post: Post) {
    quotingPost = post;
  }
</script>

{#if isPosts}
  <PostList
    posts={pagination.items as Post[]}
    users={[user]}
    currentUserId={currentUser?.id}
    onQuote={handleQuote}
    emptyMessage="No liked posts yet."
  />
{:else}
  <UserList
    users={pagination.items as User[]}
    currentUserId={currentUser?.id}
    emptyMessage="No users found."
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

{#if quotingPost}
  <QuoteComposeModal
    quotedPost={quotingPost}
    onClose={() => (quotingPost = null)}
  />
{/if}
