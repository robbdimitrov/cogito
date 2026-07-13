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
  let detailsRef: HTMLDetailsElement | null = $state(null);

  function handleRepost() {
    if (detailsRef) detailsRef.open = false;
    onRepost();
  }

  function handleQuote() {
    if (detailsRef) detailsRef.open = false;
    onQuote();
  }
</script>

<details bind:this={detailsRef} class="dropdown">
  <summary
    class="action-pill list-none {reposted
      ? 'text-success bg-success/10'
      : 'text-base-content/60 hover:text-success hover:bg-success/5'}"
    aria-label={reposted ? "Remove repost" : "Repost options"}
    aria-disabled={isReposting}
    onclick={(e) => {
      if (isReposting) e.preventDefault();
    }}
  >
    <Repeat
      class="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] {reposted
        ? 'rotate-180 scale-110'
        : 'rotate-0 scale-100'}"
    />
    <span class="text-xs sm:text-sm font-semibold tracking-wide">{reposts}</span
    >
  </summary>
  <ul class="dropdown-content menu dropdown-surface z-10 w-40 p-1">
    <li>
      <button type="button" onclick={handleRepost} disabled={isReposting}>
        <Repeat class="h-4 w-4" />
        {reposted ? "Undo Repost" : "Repost"}
      </button>
    </li>
    <li>
      <button type="button" onclick={handleQuote} disabled={isReposting}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
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
</details>
