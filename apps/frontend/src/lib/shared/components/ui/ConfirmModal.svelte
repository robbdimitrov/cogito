<script lang="ts">
  let {
    open,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onconfirm,
    oncancel,
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();
</script>

{#if open}
  <div
    class="modal modal-open"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) oncancel();
    }}
    onkeydown={(event) => {
      if (event.key === "Escape") oncancel();
    }}
  >
    <div
      class="modal-box glass-card max-w-sm p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <h2 id="confirm-modal-title" class="text-lg font-bold">{title}</h2>
      <p class="py-4 text-slate-600 dark:text-slate-300">{message}</p>
      <div class="modal-action">
        <button
          type="button"
          class="btn btn-ghost rounded-xl"
          onclick={oncancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="btn btn-error rounded-xl"
          onclick={onconfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
