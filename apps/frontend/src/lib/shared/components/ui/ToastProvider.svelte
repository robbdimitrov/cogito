<script lang="ts">
  import { AlertCircle, CheckCircle, Info, X } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { setToastContext } from "$lib/shared/toast.svelte";

  let { children }: { children: Snippet } = $props();
  const toasts = setToastContext();
</script>

{@render children()}

<div class="toast toast-top toast-end z-1100 gap-2" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div
      class={[
        "alert gap-2 px-4 py-2 text-sm shadow-lg",
        toast.type === "success"
          ? "alert-success"
          : toast.type === "error"
            ? "alert-error"
            : "alert-info",
      ]}
    >
      {#if toast.type === "success"}
        <CheckCircle class="size-5" aria-hidden="true" />
      {:else if toast.type === "error"}
        <AlertCircle class="size-5" aria-hidden="true" />
      {:else}
        <Info class="size-5" aria-hidden="true" />
      {/if}
      <span>{toast.message}</span>
      <button
        type="button"
        onclick={() => toasts.remove(toast.id)}
        class="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  {/each}
</div>
