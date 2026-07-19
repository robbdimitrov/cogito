<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Trash2, Repeat, Heart, MessageSquare } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import FormattedContent from "$lib/domains/posts/components/FormattedContent.svelte";
  import ConfirmModal from "$lib/shared/components/ui/ConfirmModal.svelte";
  import RepostMenu from "$lib/domains/posts/components/RepostMenu.svelte";
  import LoginGateButton from "$lib/shared/components/ui/LoginGateButton.svelte";
  import QuoteEmbed from "$lib/domains/posts/components/QuoteEmbed.svelte";
  import { imageUrl } from "$lib/shared/imageUrl";
  import type { Post, User } from "$lib/shared/types";

  interface Props {
    post: Post;
    user?: User;
    currentUserId?: number | null;
    onQuote?: (post: Post) => void;
    threaded?: boolean;
  }

  let {
    post,
    user,
    currentUserId,
    onQuote,
    threaded = false,
  }: Props = $props();

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
  let imageLikeBurst = $state(false);

  let deleteForm: HTMLFormElement | null = $state(null);
  let repostForm: HTMLFormElement | null = $state(null);
  let likeForm: HTMLFormElement | null = $state(null);

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

  function handleImageDoubleClick() {
    if (!currentUserId) return;
    imageLikeBurst = false;
    requestAnimationFrame(() => {
      imageLikeBurst = true;
      setTimeout(() => {
        imageLikeBurst = false;
      }, 700);
    });
    if (!liked) {
      likeForm?.requestSubmit();
    }
  }
</script>

<li>
  {#if repostedBy}
    <div
      class="subtle-border mx-auto -mb-px w-[calc(100%-1rem)] rounded-t-2xl border border-b-base-300/80 bg-base-100/75 px-4 py-2 text-xs shadow-lg shadow-base-300/15 backdrop-blur-2xl sm:px-5 sm:text-sm dark:border-b-white/15 dark:bg-base-200/85 dark:shadow-base-100/20"
    >
      <div class="flex items-center gap-2 opacity-70">
        <Repeat class="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
        <a
          href={resolve(`/@${repostedBy.username}`)}
          class="font-semibold hover:underline truncate min-w-0"
        >
          @{repostedBy.username}
        </a>
        <span class="shrink-0">reposted</span>
      </div>
    </div>
  {/if}
  <GlassCard
    interactive
    class="overflow-hidden {threaded
      ? 'rounded-none shadow-none'
      : ''} {repostedBy ? 'rounded-b-2xl rounded-t-none' : ''}"
  >
    <div class="card-body p-4 sm:p-5 {threaded ? 'sm:p-4' : ''}">
      <div class="flex items-start gap-3 sm:gap-4">
        {#if author}
          <a
            href={resolve(`/@${author.username}`)}
            class="shrink-0 transition-transform duration-200 hover:scale-105"
          >
            <Avatar
              name={author.name}
              size={threaded ? "sm" : "md"}
              photoKey={author.profilePhotoKey}
            />
          </a>
        {/if}
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 sm:gap-4">
            <div class="flex min-w-0 flex-col">
              {#if author}
                <a
                  href={resolve(`/@${author.username}`)}
                  class="max-w-full truncate text-base font-bold leading-tight tracking-tight text-base-content hover:underline sm:text-lg"
                >
                  {author.name}
                </a>
                <a
                  href={resolve(`/@${author.username}`)}
                  class="muted-text max-w-full truncate text-sm transition-colors hover:text-base-content/80"
                >
                  @{author.username}
                </a>
              {/if}
            </div>
            <div class="shrink-0">
              {#if isOwnPost}
                <button
                  type="button"
                  class="btn btn-ghost btn-sm btn-square shrink-0 opacity-40 transition-transform duration-150 hover:scale-110 hover:bg-error/10 hover:text-error hover:opacity-100 active:scale-90"
                  onclick={() => (showDeleteModal = true)}
                  aria-label="Delete post"
                >
                  <Trash2 class="size-4" />
                </button>
              {/if}
            </div>
          </div>
          {#if displayPost.inReplyToUsername}
            <a
              href={resolve(`/posts/${displayPost.inReplyToId}`)}
              class="muted-text mt-0.5 block text-xs hover:text-base-content/80"
            >
              Replying to <span class="text-primary"
                >@{displayPost.inReplyToUsername}</span
              >
            </a>
          {/if}
          <FormattedContent
            content={displayPost.content}
            class="mt-1.5 whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed text-base-content/85 sm:mt-2 sm:text-[1.05rem]"
          />
          {#if displayPost.mediaKey}
            <div
              class="relative mt-3 inline-block"
              role="presentation"
              ondblclick={handleImageDoubleClick}
            >
              <img
                src={imageUrl(displayPost.mediaKey)}
                alt="Post attachment"
                loading="lazy"
                decoding="async"
                class="subtle-border max-h-96 w-auto rounded-xl border object-contain"
              />
              {#if imageLikeBurst}
                <div
                  class="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <Heart
                    class="size-20 animate-like-burst fill-white text-white drop-shadow-lg"
                  />
                </div>
              {/if}
            </div>
          {/if}
          {#if displayPost.quotePost}
            <QuoteEmbed post={displayPost.quotePost} />
          {/if}
          <div
            class="subtle-border mt-3 flex items-center justify-between border-t pt-3 sm:mt-4"
          >
            <div class="flex items-center gap-1 sm:gap-2">
              <a
                href={resolve(`/posts/${displayPost.id}`)}
                class="action-pill gap-1.5 px-3 opacity-60 hover:bg-primary/5 hover:text-primary hover:opacity-100"
                aria-label="Replies"
              >
                <MessageSquare class="size-4" />
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
                    const previousDelta = optimisticRepostsDelta;
                    optimisticRepostOverride = !wasReposted;
                    optimisticRepostsDelta += wasReposted ? -1 : 1;

                    return async ({ result, update }) => {
                      isReposting = false;

                      if (result.type === "failure") {
                        optimisticRepostOverride = wasReposted;
                        optimisticRepostsDelta = previousDelta;
                        return;
                      }
                      await update({ invalidateAll: false });
                    };
                  }}
                >
                  <input type="hidden" name="postId" value={displayPost.id} />
                  <input
                    type="hidden"
                    name="reposted"
                    value={String(reposted)}
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
                <LoginGateButton
                  icon={Repeat}
                  ariaLabel="Log in to repost"
                  buttonClass="action-pill opacity-60"
                  count={reposts}
                  countClass="text-xs sm:text-sm font-semibold tracking-wide"
                />
              {/if}

              {#if currentUserId}
                <form
                  bind:this={likeForm}
                  method="POST"
                  action="?/toggleLike"
                  use:enhance={() => {
                    if (isLiking) return () => {};
                    isLiking = true;
                    const wasLiked = liked;
                    const previousDelta = optimisticLikesDelta;
                    optimisticLikeOverride = !wasLiked;
                    optimisticLikesDelta += wasLiked ? -1 : 1;

                    return async ({ result, update }) => {
                      isLiking = false;

                      if (result.type === "failure") {
                        optimisticLikeOverride = wasLiked;
                        optimisticLikesDelta = previousDelta;
                        return;
                      }
                      await update({ invalidateAll: false });
                    };
                  }}
                >
                  <input type="hidden" name="postId" value={displayPost.id} />
                  <input type="hidden" name="liked" value={String(liked)} />
                  <button
                    type="submit"
                    class="action-pill disabled:opacity-70 {liked
                      ? 'text-error bg-error/10 disabled:text-error!'
                      : 'opacity-60 hover:text-error hover:bg-error/5 hover:opacity-100'}"
                    disabled={isLiking}
                    aria-label={liked ? "Unlike post" : "Like post"}
                  >
                    <Heart
                      class="size-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] {liked
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
                <LoginGateButton
                  icon={Heart}
                  ariaLabel="Log in to like"
                  buttonClass="action-pill opacity-60"
                  count={likes}
                  countClass="text-xs sm:text-sm font-semibold tracking-wide"
                />
              {/if}
            </div>

            {#if author}
              <a
                href={resolve(`/posts/${displayPost.id}`)}
                class="muted-text shrink-0 text-xs transition-colors hover:text-primary sm:text-sm"
              >
                {formatPostDate(displayPost.created)}
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
