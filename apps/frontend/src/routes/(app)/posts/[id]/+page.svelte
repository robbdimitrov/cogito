<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    AlertTriangle,
    ArrowLeft,
    Trash2,
    Repeat,
    Heart,
  } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import ConfirmModal from "$lib/shared/components/ui/ConfirmModal.svelte";
  import FormattedContent from "$lib/domains/posts/components/FormattedContent.svelte";
  import ReplyComposer from "$lib/domains/posts/components/ReplyComposer.svelte";
  import PostItem from "$lib/domains/posts/components/PostItem.svelte";
  import LoginGateButton from "$lib/domains/posts/components/LoginGateButton.svelte";
  import QuoteComposeModal from "$lib/domains/posts/components/QuoteComposeModal.svelte";
  import { imageUrl } from "$lib/shared/imageUrl";
  import { enhance } from "$app/forms";
  import { getToastContext } from "$lib/shared/toast.svelte";
  import type { Post } from "$lib/domains/posts/model";

  let { data } = $props();
  let user = $derived(data.currentUser);
  const replies = $derived(data.replies.items);

  const toast = getToastContext();

  // svelte-ignore state_referenced_locally
  // eslint-disable-next-line svelte/prefer-writable-derived -- post is mutated for optimistic like/repost updates, then re-synced by the $effect below
  let post = $state(data.post);
  let showDeleteModal = $state(false);

  $effect(() => {
    post = data.post;
  });
  let quotingPost = $state<Post | null>(null);

  // Optimistic states for main post
  let isLiking = $state(false);
  let isReposting = $state(false);

  function formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    return `${diffDay}d`;
  }
</script>

<svelte:head>
  <title>{post ? `Post by ${post.user?.name}` : "Post not found"}</title>
  {#if post}
    <meta property="og:title" content="Post by {post.user?.name}" />
    <meta property="og:description" content={post.content} />
    {#if post.mediaKey}
      <meta property="og:image" content={imageUrl(post.mediaKey)} />
    {/if}
  {/if}
</svelte:head>

{#if !post || !post.user}
  <div class="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
    <GlassCard>
      <div class="card-body items-center py-12 text-center">
        <AlertTriangle class="mb-4 h-16 w-16 opacity-30" />
        <p class="text-slate-600 dark:text-slate-300">Post not found.</p>
        <a href={resolve("/")} class="btn btn-primary btn-sm mt-4"
          >Back to Feed</a
        >
      </div>
    </GlassCard>
  </div>
{:else}
  <div class="container mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6">
    <div class="mb-3 sm:mb-4">
      <a
        href={resolve("/")}
        class="btn btn-ghost btn-sm gap-1 rounded-full px-3"
      >
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
    </div>

    <GlassCard class="overflow-hidden">
      <div class="card-body p-4 sm:p-5">
        <div class="flex items-start gap-3 sm:gap-4">
          <a href={resolve(`/@${post.user.username}`)} class="shrink-0">
            <Avatar
              name={post.user.name}
              size="md"
              photoKey={post.user.profilePhotoKey}
            />
          </a>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a
                  href={resolve(`/@${post.user.username}`)}
                  class="truncate font-semibold text-base-content hover:underline"
                >
                  {post.user.name}
                </a>
                <span class="text-sm text-slate-500 dark:text-slate-400"
                  >@{post.user.username}</span
                >
                <span class="text-sm text-slate-500 dark:text-slate-400"
                  >· {formatRelativeTime(post.created)}</span
                >
              </div>
              {#if user && post.userId === user.id}
                <button
                  type="button"
                  class="btn btn-ghost btn-xs h-auto p-1 text-slate-500 transition-transform duration-150 hover:scale-110 hover:text-error active:scale-90 dark:text-slate-400"
                  onclick={() => (showDeleteModal = true)}
                  aria-label="Delete post"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
            <FormattedContent
              content={post.content}
              class="mt-3 whitespace-pre-wrap wrap-break-word text-[1.02rem] leading-relaxed sm:mt-4 sm:text-lg"
            />
            {#if post.mediaKey}
              <div class="mt-3 sm:mt-4">
                <img
                  src={imageUrl(post.mediaKey)}
                  alt="Post attachment"
                  class="max-h-125 w-auto rounded-xl border border-slate-200 object-contain dark:border-slate-800"
                />
              </div>
            {/if}

            <div
              class="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 sm:mt-6 sm:gap-6 sm:pt-4 dark:border-slate-700"
            >
              {#if user}
                <form
                  method="POST"
                  action="?/toggleRepost"
                  use:enhance={() => {
                    if (!post) return;
                    const prev = {
                      reposted: post.reposted,
                      reposts: post.reposts,
                    };
                    post.reposted = !post.reposted;
                    post.reposts += post.reposted ? 1 : -1;
                    isReposting = true;
                    return async ({ result, update }) => {
                      if (!post) return;
                      isReposting = false;
                      if (result.type === "failure") {
                        post.reposted = prev.reposted;
                        post.reposts = prev.reposts;
                        toast.error("Action failed");
                      } else {
                        await update({ invalidateAll: false });
                      }
                    };
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <input
                    type="hidden"
                    name="reposted"
                    value={String(!post.reposted)}
                  />
                  <button
                    type="submit"
                    class="btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 {post.reposted
                      ? 'bg-success/10 text-success'
                      : 'text-slate-500 hover:bg-success/10 hover:text-success dark:text-slate-400'}"
                    disabled={isReposting}
                  >
                    <Repeat class="h-4 w-4 sm:h-5 sm:w-5" />
                    {post.reposts}
                  </button>
                </form>

                <form
                  method="POST"
                  action="?/toggleLike"
                  use:enhance={() => {
                    if (!post) return;
                    const prev = { liked: post.liked, likes: post.likes };
                    post.liked = !post.liked;
                    post.likes += post.liked ? 1 : -1;
                    isLiking = true;
                    return async ({ result, update }) => {
                      if (!post) return;
                      isLiking = false;
                      if (result.type === "failure") {
                        post.liked = prev.liked;
                        post.likes = prev.likes;
                        toast.error("Action failed");
                      } else {
                        await update({ invalidateAll: false });
                      }
                    };
                  }}
                >
                  <input type="hidden" name="postId" value={post.id} />
                  <input
                    type="hidden"
                    name="liked"
                    value={String(!post.liked)}
                  />
                  <button
                    type="submit"
                    class="btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 transition-all duration-150 hover:scale-105 active:scale-95 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 {post.liked
                      ? 'bg-error/10 text-error'
                      : 'text-slate-500 hover:bg-error/10 hover:text-error dark:text-slate-400'}"
                    disabled={isLiking}
                  >
                    <Heart
                      class="h-4 w-4 sm:h-5 sm:w-5"
                      fill={post.liked ? "currentColor" : "none"}
                    />
                    {post.likes}
                  </button>
                </form>
              {:else}
                <LoginGateButton
                  icon={Repeat}
                  iconClass="h-4 w-4 sm:h-5 sm:w-5"
                  ariaLabel="Log in to repost"
                  buttonClass="btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 text-slate-500 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 dark:text-slate-400"
                  count={post.reposts}
                />
                <LoginGateButton
                  icon={Heart}
                  iconClass="h-4 w-4 sm:h-5 sm:w-5"
                  ariaLabel="Log in to like"
                  buttonClass="btn btn-ghost btn-xs h-8 min-h-8 gap-1 rounded-full px-3 text-slate-500 sm:btn-sm sm:h-10 sm:min-h-10 sm:px-4 dark:text-slate-400"
                  count={post.likes}
                />
              {/if}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>

    <ConfirmModal
      open={showDeleteModal}
      title="Delete Post"
      message="Are you sure you want to delete this post? This action cannot be undone."
      confirmText="Delete"
      onconfirm={() => {
        if (!post) return;
        // Need to submit to delete action
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "?/deletePost";
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "postId";
        input.value = String(post.id);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
      }}
      oncancel={() => (showDeleteModal = false)}
    />

    {#if user && post}
      <div class="mt-3">
        <ReplyComposer currentUser={user} replyToPost={post} />
      </div>
    {/if}

    {#if user}
      {#if replies.length > 0}
        <div
          class="mt-2 space-y-0 divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {#each replies as reply (reply.id)}
            <PostItem
              post={reply}
              currentUserId={user?.id}
              onQuote={(p) => (quotingPost = p)}
            />
          {/each}
        </div>
      {/if}
    {:else}
      <div class="mt-3 text-center">
        <a href={resolve("/login")} class="link link-primary text-sm">
          Log in to see replies
        </a>
      </div>
    {/if}

    {#if quotingPost}
      <QuoteComposeModal
        quotedPost={quotingPost}
        onClose={() => (quotingPost = null)}
      />
    {/if}
  </div>
{/if}
