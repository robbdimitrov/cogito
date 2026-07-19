<script lang="ts">
  import PostItem from "$lib/domains/posts/components/PostItem.svelte";
  import { MessageSquare } from "@lucide/svelte";
  import EmptyState from "$lib/shared/components/ui/EmptyState.svelte";
  import type { Post, User } from "$lib/shared/types";

  interface Props {
    posts: Post[];
    users?: User[];
    currentUserId?: number | null;
    onQuote?: (post: Post) => void;
    emptyMessage?: string;
  }

  let {
    posts,
    users = [],
    currentUserId,
    onQuote,
    emptyMessage = "No posts yet. Share what's on your mind!",
  }: Props = $props();

  let usersById = $derived(new Map(users.map((u) => [u.id, u])));
</script>

{#if !posts || posts.length === 0}
  <EmptyState icon={MessageSquare} message={emptyMessage} />
{:else}
  <ul class="space-y-3">
    {#each posts as post (post.publicId + (post.repostOfPublicId ? `-repost-${post.userId}` : ""))}
      <PostItem
        {post}
        user={usersById.get(post.userId) ?? users[0]}
        {currentUserId}
        {onQuote}
      />
    {/each}
  </ul>
{/if}
