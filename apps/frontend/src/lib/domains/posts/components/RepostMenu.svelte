<script lang="ts">
  import { Repeat } from "@lucide/svelte";

  interface Props {
    reposted: boolean;
    reposts: number;
    isReposting: boolean;
    onRepost: () => void;
    onQuote: () => void;
  }

  let { reposted, reposts, isReposting, onRepost, onQuote }: Props = $props();

  let triggerRef: HTMLButtonElement | null = $state(null);
  let menuRef: HTMLUListElement | null = $state(null);
  let open = $state(false);
  let menuStyle = $state("");

  function toggleMenu() {
    if (isReposting) return;
    if (!open && triggerRef) {
      const rect = triggerRef.getBoundingClientRect();
      menuStyle = `left:${rect.left}px; top:${rect.bottom + 8}px;`;
    }
    open = !open;
  }

  function closeMenu() {
    open = false;
  }

  function handleRepost() {
    closeMenu();
    onRepost();
  }

  function handleQuote() {
    closeMenu();
    onQuote();
  }

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  $effect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef?.contains(target) || triggerRef?.contains(target)) return;
      closeMenu();
    }
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
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
  <ul
    bind:this={menuRef}
    use:portal
    style={menuStyle}
    class="dropdown-surface menu fixed z-50 w-40 p-1"
  >
    <li>
      <button type="button" onclick={handleRepost} disabled={isReposting}>
        <Repeat class="size-4" />
        {reposted ? "Undo Repost" : "Repost"}
      </button>
    </li>
    <li>
      <button type="button" onclick={handleQuote} disabled={isReposting}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
          />
          <path
            d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
          />
        </svg>
        Quote
      </button>
    </li>
  </ul>
{/if}
