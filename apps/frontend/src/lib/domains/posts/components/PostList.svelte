<script lang="ts">
  import PostItem from "$lib/domains/posts/components/PostItem.svelte";
  import { MessageSquare } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
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
  <GlassCard>
    <div class="card-body muted-text items-center py-12 text-center">
      <MessageSquare class="h-12 w-12 mb-2 text-base-content opacity-50" />
      <p>{emptyMessage}</p>
    </div>
  </GlassCard>
{:else}
  <ul class="space-y-3">
    {#each posts as post (post.id + (post.repostOfId ? `-repost-${post.userId}` : ""))}
      <PostItem
        {post}
        user={usersById.get(post.userId) ?? users[0]}
        {currentUserId}
        {onQuote}
      />
    {/each}
  </ul>
{/if}
