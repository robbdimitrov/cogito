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

  function handleClose() {
    if (!isSubmitting) onClose();
  }
</script>

<dialog class="modal modal-open">
  <div class="modal-box max-w-lg">
    <h3 class="font-bold text-lg mb-3">Repost</h3>
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
        class="textarea textarea-bordered w-full resize-none text-base leading-relaxed"
        placeholder="Add a comment…"
        bind:value={content}
        maxlength={255}
        rows={3}
        autofocus></textarea>
      <div
        class="text-right text-sm mt-1 {content.length > 240
          ? 'text-warning'
          : 'text-slate-500 dark:text-slate-400'}"
      >
        {content.length}/255
      </div>
      <QuoteEmbed post={quotedPost} />
      <div class="modal-action mt-4">
        <button
          type="button"
          class="btn btn-ghost"
          onclick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
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
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" onclick={handleClose} role="dialog"></div>
</dialog>
