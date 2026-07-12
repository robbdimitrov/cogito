<script lang="ts">
  import { enhance } from "$app/forms";
  import { Send } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import Typeahead from "$lib/shared/components/ui/Typeahead.svelte";
  import { getCaretLineTop } from "$lib/shared/caretLineTop";
  import { createFloatingPosition } from "$lib/shared/floatingPosition.svelte";
  import { portal } from "$lib/shared/portal";
  import { createTypeaheadController } from "$lib/shared/typeaheadController.svelte";
  import type { User, Post } from "$lib/shared/types";

  interface Props {
    currentUser: User;
    replyToPost: Post;
  }

  let { currentUser, replyToPost }: Props = $props();

  let content = $state("");
  let isSubmitting = $state(false);
  let textareaRef: HTMLTextAreaElement | null = $state(null);
  let typeahead = createTypeaheadController();
  let dropdownPos = createFloatingPosition();
  let lastCaretLineTop = 0;
  let lastPaddingLeft = 0;

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    content = target.value;
    const caret = target.selectionStart ?? content.length;
    typeahead.handleInput(content, caret);
    if (typeahead.token) {
      lastCaretLineTop = getCaretLineTop(target, caret);
      lastPaddingLeft = parseFloat(getComputedStyle(target).paddingLeft) || 0;
      dropdownPos.placeAtLine(target, lastCaretLineTop, lastPaddingLeft);
    }
  }

  function handleTypeaheadSelect(value: string) {
    const next = typeahead.select(content, value, textareaRef);
    if (next !== null) content = next;
  }

  $effect(() => {
    if (typeahead.items.length === 0 || !textareaRef) return;
    const el = textareaRef;
    const reposition = () =>
      dropdownPos.placeAtLine(el, lastCaretLineTop, lastPaddingLeft);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  });
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
      typeahead.reset();
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
      oninput={handleInput}
      maxlength={255}
      rows={2}></textarea>
    {#if typeahead.items.length > 0}
      <div
        use:portal
        style="position: fixed; top: {dropdownPos.top}px; left: {dropdownPos.left}px;"
      >
        <Typeahead
          items={typeahead.items}
          display={typeahead.displayItem}
          onselect={handleTypeaheadSelect}
        />
      </div>
    {/if}
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
