<script lang="ts">
  import CreatePost from "$lib/domains/posts/components/CreatePost.svelte";
  import type { User } from "$lib/domains/users/model";
  import type { Post } from "$lib/shared/types";

  interface Props {
    user: User;
    quotedPost: Post;
    onClose: () => void;
  }

  let { user, quotedPost, onClose }: Props = $props();
</script>

<dialog class="modal modal-open">
  <div class="modal-box max-w-xl bg-transparent p-0 shadow-none">
    <CreatePost {user} {quotedPost} {onClose} />
  </div>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={onClose}
    role="dialog"
    tabindex="-1"
  ></div>
</dialog>
