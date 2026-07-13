<script lang="ts">
  import { enhance } from "$app/forms";
  import type { Post } from "$lib/shared/types";
  import QuoteEmbed from "$lib/domains/posts/components/QuoteEmbed.svelte";

  interface Props {
    quotedPost: Post;
    onClose: () => void;
  }

  let { quotedPost, onClose }: Props = $props();

  let content = $state("");
  let isSubmitting = $state(false);
  let textarea = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    textarea?.focus();
  });

  function handleClose() {
    if (!isSubmitting) onClose();
  }
</script>

<dialog class="modal modal-open">
  <div class="modal-box glass-card max-w-lg p-6">
    <h3 class="mb-3 text-lg font-bold">Repost</h3>
    <form
      method="POST"
      action="?/quote"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update, result }) => {
          isSubmitting = false;
          if (result.type === "success") {
            onClose();
          }
          await update({ invalidateAll: false });
        };
      }}
    >
      <input type="hidden" name="quotePostId" value={quotedPost.id} />
      <textarea
        name="content"
        class="form-textarea min-h-0 resize-none"
        placeholder="Add a comment…"
        bind:value={content}
        maxlength={255}
        rows={3}
        bind:this={textarea}></textarea>
      <div
        class="mt-1 text-right text-sm {content.length > 240
          ? 'text-warning'
          : 'muted-text'}"
      >
        {content.length}/255
      </div>
      <QuoteEmbed post={quotedPost} />
      <div class="modal-action mt-4">
        <button
          type="button"
          class="btn btn-ghost rounded-xl"
          onclick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary rounded-xl"
          disabled={isSubmitting || !content.trim()}
        >
          {#if isSubmitting}
            <span class="loading loading-spinner loading-xs"></span>
          {/if}
          Repost
        </button>
      </div>
    </form>
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={handleClose}
    role="dialog"
    tabindex="-1"
  ></div>
</dialog>
