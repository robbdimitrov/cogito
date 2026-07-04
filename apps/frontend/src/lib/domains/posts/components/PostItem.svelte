<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Trash2, Repeat, Heart, MessageSquare } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import FormattedContent from "$lib/domains/posts/components/FormattedContent.svelte";
  import ConfirmModal from "$lib/shared/components/ui/ConfirmModal.svelte";
  import RepostMenu from "$lib/domains/posts/components/RepostMenu.svelte";
  import QuoteEmbed from "$lib/domains/posts/components/QuoteEmbed.svelte";
  import { imageUrl } from "$lib/shared/imageUrl";
  import type { Post, User } from "$lib/shared/types";

  interface Props {
    post: Post;
    user?: User;
    currentUserId?: number | null;
    onQuote?: (post: Post) => void;
  }

  let { post, user, currentUserId, onQuote }: Props = $props();

  let isRepost = $derived(!!post.repostOfId);
  let displayPost = $derived(isRepost && post.repostOf ? post.repostOf : post);
  let repostedBy = $derived(isRepost ? post.user : undefined);
  let author = $derived(displayPost.user || user);
  let isOwnPost = $derived(currentUserId && post.userId === currentUserId);

  let optimisticLikeOverride = $state<boolean | null>(null);
  let liked = $derived(
    optimisticLikeOverride !== null
      ? optimisticLikeOverride
      : (displayPost.liked ?? false),
  );

  let optimisticLikesDelta = $state(0);
  let likes = $derived(
    Math.max(0, (displayPost.likes ?? 0) + optimisticLikesDelta),
  );

  let optimisticRepostOverride = $state<boolean | null>(null);
  let reposted = $derived(
    optimisticRepostOverride !== null
      ? optimisticRepostOverride
      : (displayPost.reposted ?? false),
  );

  let optimisticRepostsDelta = $state(0);
  let reposts = $derived(
    Math.max(0, (displayPost.reposts ?? 0) + optimisticRepostsDelta),
  );

  let showDeleteModal = $state(false);
  let isDeleting = $state(false);
  let isLiking = $state(false);
  let isReposting = $state(false);

  let deleteForm: HTMLFormElement | null = $state(null);
  let repostForm: HTMLFormElement | null = $state(null);

  function formatPostDate(dateString: string | undefined) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const day = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
    return `${time} · ${day}`;
  }

  function triggerRepost() {
    if (repostForm) repostForm.requestSubmit();
  }
</script>

<li>
  {#if repostedBy}
    <div
      class="mx-auto -mb-px flex w-[calc(100%-1rem)] items-center gap-2 rounded-t-2xl border border-b-slate-200/70 border-white/60 bg-base-100/75 px-4 sm:px-5 py-2 text-xs sm:text-sm text-slate-600 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:border-b-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300"
    >
      <Repeat class="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
      <a
        href={resolve(`/@${repostedBy.username}`)}
        class="font-semibold hover:underline truncate min-w-0"
      >
        @{repostedBy.username}
      </a>
      <span class="shrink-0">reposted</span>
    </div>
  {/if}
  <GlassCard
    interactive
    class="overflow-hidden {repostedBy ? 'rounded-b-2xl rounded-t-none' : ''}"
  >
    <div class="card-body p-4 sm:p-5">
      <div class="flex items-start gap-3 sm:gap-4">
        {#if author}
          <a
            href={resolve(`/@${author.username}`)}
            class="shrink-0 transition-transform duration-200 hover:scale-105"
          >
            <Avatar
              name={author.name}
              size="md"
              photoKey={author.profilePhotoKey}
            />
          </a>
        {/if}
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 sm:gap-4">
            <div class="flex flex-col min-w-0">
              {#if author}
                <a
                  href={resolve(`/@${author.username}`)}
                  class="font-bold hover:underline truncate max-w-full text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-0.5 sm:mb-1"
                >
                  {author.name}
                </a>
                <a
                  href={resolve(`/@${author.username}`)}
                  class="text-[0.9rem] sm:text-sm text-slate-500 dark:text-slate-400 truncate max-w-full hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  @{author.username}
                </a>
              {/if}
            </div>
            {#if isOwnPost}
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square text-slate-400 dark:text-slate-500 hover:text-error hover:bg-error/10 hover:scale-110 active:scale-90 transition-transform duration-150 shrink-0"
                onclick={() => (showDeleteModal = true)}
                aria-label="Delete post"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            {/if}
          </div>
          <FormattedContent
            content={displayPost.content}
            class="mt-3 sm:mt-3.5 whitespace-pre-wrap wrap-break-word text-[15px] sm:text-[1.05rem] leading-relaxed text-slate-800 dark:text-slate-200"
          />
          {#if displayPost.mediaKey}
            <div class="mt-3">
              <img
                src={imageUrl(displayPost.mediaKey)}
                alt="Post attachment"
                loading="lazy"
                decoding="async"
                class="max-h-96 w-auto rounded-xl object-contain border border-slate-200 dark:border-slate-800"
              />
            </div>
          {/if}
          {#if displayPost.quotePost}
            <QuoteEmbed post={displayPost.quotePost} />
          {/if}
          <div class="mt-3">
            <a
              href={resolve(`/posts/${displayPost.id}`)}
              class="text-[0.8rem] sm:text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
            >
              {formatPostDate(displayPost.created)}
            </a>
          </div>
          <div
            class="mt-3 sm:mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 sm:gap-3"
          >
            <a
              href={resolve(`/posts/${displayPost.id}`)}
              class="btn btn-ghost btn-sm gap-1.5 rounded-full px-3 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 transition-all duration-150"
              aria-label="Replies"
            >
              <MessageSquare class="h-4 w-4" />
              <span class="text-xs sm:text-sm font-semibold"
                >{displayPost.replies ?? 0}</span
              >
            </a>

            {#if currentUserId}
              <form
                bind:this={repostForm}
                method="POST"
                action="?/toggleRepost"
                class="hidden"
                use:enhance={() => {
                  if (isReposting) return () => {};
                  isReposting = true;
                  const wasReposted = reposted;
                  optimisticRepostOverride = !wasReposted;
                  optimisticRepostsDelta += wasReposted ? -1 : 1;

                  return async ({ result, update }) => {
                    isReposting = false;
                    optimisticRepostOverride = null;
                    optimisticRepostsDelta = 0;

                    if (result.type !== "failure") {
                      await update({ invalidateAll: false });
                    }
                  };
                }}
              >
                <input type="hidden" name="postId" value={displayPost.id} />
                <input
                  type="hidden"
                  name="reposted"
                  value={String(displayPost.reposted ?? false)}
                />
              </form>

              <RepostMenu
                {reposted}
                {reposts}
                {isReposting}
                onRepost={triggerRepost}
                onQuote={() => onQuote?.(displayPost)}
              />
            {:else}
              <a
                href={resolve("/login")}
                class="btn btn-ghost btn-sm gap-2 rounded-full px-4 text-slate-500 dark:text-slate-400"
                aria-label="Log in to repost"
              >
                <Repeat class="h-4 w-4" />
                <span class="text-xs sm:text-sm font-semibold tracking-wide"
                  >{reposts}</span
                >
              </a>
            {/if}

            {#if currentUserId}
              <form
                method="POST"
                action="?/toggleLike"
                use:enhance={() => {
                  if (isLiking) return () => {};
                  isLiking = true;
                  const wasLiked = liked;
                  optimisticLikeOverride = !wasLiked;
                  optimisticLikesDelta += wasLiked ? -1 : 1;

                  return async ({ result, update }) => {
                    isLiking = false;
                    optimisticLikeOverride = null;
                    optimisticLikesDelta = 0;

                    if (result.type !== "failure") {
                      await update({ invalidateAll: false });
                    }
                  };
                }}
              >
                <input type="hidden" name="postId" value={displayPost.id} />
                <input
                  type="hidden"
                  name="liked"
                  value={String(displayPost.liked ?? false)}
                />
                <button
                  type="submit"
                  class="btn btn-ghost btn-sm gap-2 rounded-full px-4 hover:scale-105 active:scale-95 transition-all duration-150 {liked
                    ? 'text-error bg-error/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-error hover:bg-error/5'}"
                  disabled={isLiking}
                  aria-label={liked ? "Unlike post" : "Like post"}
                >
                  <Heart
                    class="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] {liked
                      ? 'scale-125'
                      : 'scale-100'}"
                    fill={liked ? "currentColor" : "none"}
                  />
                  <span class="text-xs sm:text-sm font-semibold tracking-wide"
                    >{likes}</span
                  >
                </button>
              </form>
            {:else}
              <a
                href={resolve("/login")}
                class="btn btn-ghost btn-sm gap-2 rounded-full px-4 text-slate-500 dark:text-slate-400"
                aria-label="Log in to like"
              >
                <Heart class="h-4 w-4" />
                <span class="text-xs sm:text-sm font-semibold tracking-wide"
                  >{likes}</span
                >
              </a>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </GlassCard>

  <form
    bind:this={deleteForm}
    method="POST"
    action="?/deletePost"
    class="hidden"
    use:enhance={() => {
      if (isDeleting) return () => {};
      isDeleting = true;
      return async ({ update }) => {
        isDeleting = false;
        showDeleteModal = false;
        await update();
      };
    }}
  >
    <input type="hidden" name="postId" value={post.id} />
  </form>

  <ConfirmModal
    open={showDeleteModal}
    title="Delete Post"
    message="Are you sure you want to delete this post? This action cannot be undone."
    confirmText="Delete"
    onconfirm={() => {
      if (deleteForm) deleteForm.requestSubmit();
    }}
    oncancel={() => (showDeleteModal = false)}
  />
</li>
