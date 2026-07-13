<script lang="ts">
  import { enhance } from "$app/forms";
  import { Send } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import type { User, Post } from "$lib/shared/types";

  interface Props {
    currentUser: User;
    replyToPost: Post;
  }

  let { currentUser, replyToPost }: Props = $props();

  let content = $state("");
  let isSubmitting = $state(false);
  let textareaRef: HTMLTextAreaElement | null = $state(null);
</script>

<form
  method="POST"
  action="?/reply"
  class="flex items-start gap-3"
  use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      isSubmitting = false;
      content = "";
      await update({ invalidateAll: false });
    };
  }}
>
  <div class="shrink-0">
    <Avatar
      name={currentUser?.name}
      size="sm"
      photoKey={currentUser?.profilePhotoKey}
    />
  </div>
  <div class="flex-1 min-w-0">
    <textarea
      bind:this={textareaRef}
      name="content"
      class="textarea textarea-bordered w-full resize-none text-sm leading-relaxed"
      placeholder="Reply to @{replyToPost.user?.username ?? 'this post'}…"
      bind:value={content}
      maxlength={255}
      rows={2}></textarea>
  </div>
  <button
    type="submit"
    class="btn btn-primary btn-sm btn-square shrink-0 mt-1"
    disabled={isSubmitting || !content.trim()}
    aria-label="Send reply"
  >
    {#if isSubmitting}
      <span class="loading loading-spinner loading-xs"></span>
    {:else}
      <Send class="h-4 w-4" />
    {/if}
  </button>
</form>
