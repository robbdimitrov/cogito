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
</script>

{#if !posts || posts.length === 0}
  <GlassCard>
    <div
      class="card-body items-center text-center text-slate-600 dark:text-slate-300 py-12"
    >
      <MessageSquare class="h-12 w-12 mb-2 opacity-50" />
      <p>{emptyMessage}</p>
    </div>
  </GlassCard>
{:else}
  <ul class="space-y-3">
    {#each posts as post (post.id + (post.repostOfId ? `-repost-${post.userId}` : ""))}
      <PostItem
        {post}
        user={users.find((u) => u.id === post.userId) ?? users[0]}
        {currentUserId}
        {onQuote}
      />
    {/each}
  </ul>
{/if}
