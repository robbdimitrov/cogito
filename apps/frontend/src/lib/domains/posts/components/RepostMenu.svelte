<script lang="ts">
  import { Repeat, Quote } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";

  interface Props {
    reposted: boolean;
    reposts: number;
    isReposting: boolean;
    onRepost: () => void;
    onQuote: () => void;
  }

  let { reposted, reposts, isReposting, onRepost, onQuote }: Props = $props();

  const actionButtonClass =
    "flex w-full flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-base-content/10 disabled:opacity-50";

  let triggerRef: HTMLButtonElement | null = $state(null);
  let sheetRef: HTMLDivElement | null = $state(null);
  let open = $state(false);

  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as Node;
    if (sheetRef?.contains(target) || triggerRef?.contains(target)) return;
    closeMenu();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") closeMenu();
  }

  // Attached synchronously here, not via $effect (which flushes a tick late
  // and can miss a same-tick second click, e.g. one opening another overlay).
  function toggleMenu() {
    if (isReposting) return;
    if (open) {
      closeMenu();
    } else {
      open = true;
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleKeydown);
    }
  }

  function closeMenu() {
    open = false;
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleKeydown);
  }

  function handleRepost() {
    closeMenu();
    onRepost();
  }

  function handleQuote() {
    closeMenu();
    onQuote();
  }

  // onDestroy fires during SSR teardown too (unlike $effect), so guard the
  // browser-only cleanup.
  onDestroy(() => {
    if (!browser) return;
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleKeydown);
  });
</script>

<button
  bind:this={triggerRef}
  type="button"
  onclick={toggleMenu}
  class="action-pill {reposted
    ? 'text-success bg-success/10'
    : 'opacity-60 hover:text-success hover:bg-success/5 hover:opacity-100'}"
  aria-label={reposted ? "Remove repost" : "Repost options"}
  aria-haspopup="true"
  aria-expanded={open}
  disabled={isReposting}
>
  <Repeat
    class="size-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] {reposted
      ? 'rotate-180 scale-110'
      : 'rotate-0 scale-100'}"
  />
  <span class="text-xs sm:text-sm font-semibold tracking-wide">{reposts}</span>
</button>

{#if open}
  <div
    bind:this={sheetRef}
    role="group"
    aria-label="Repost options"
    transition:slide={{ duration: 220, easing: cubicOut }}
    class="dropdown-surface absolute inset-x-0 bottom-0 z-10 flex w-full divide-x divide-base-300/80 rounded-t-none border-t p-0 dark:divide-white/15"
  >
    <button
      type="button"
      class={actionButtonClass}
      onclick={handleRepost}
      disabled={isReposting}
    >
      <Repeat class="size-4" />
      {reposted ? "Undo Repost" : "Repost"}
    </button>
    <button
      type="button"
      class={actionButtonClass}
      onclick={handleQuote}
      disabled={isReposting}
    >
      <Quote class="size-4" />
      Quote
    </button>
  </div>
{/if}
