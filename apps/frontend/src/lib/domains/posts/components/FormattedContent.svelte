<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Pathname } from "$app/types";
  import { formatContent } from "$lib/domains/posts/format";

  interface Props {
    content: string;
    class?: string;
  }

  let { content, class: className = "" }: Props = $props();

  let tokens = $derived(formatContent(content));
</script>

<p class={className}>
  {#each tokens as token (token.id)}
    {#if token.type === "text"}
      {token.text}
    {:else if token.type === "url"}
      <!-- eslint-disable svelte/no-navigation-without-resolve -- external URLs are not SvelteKit routes -->
      <a
        href={token.url}
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-primary hover:underline break-all"
      >
        {token.url}
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {:else if token.type === "hashtag"}
      <a
        href={resolve(token.href as Pathname)}
        class="font-medium text-primary hover:underline"
      >
        #{token.tag}
      </a>
    {:else if token.type === "mention"}
      <a
        href={resolve(token.href as Pathname)}
        class="font-medium text-primary hover:underline"
      >
        @{token.handle}
      </a>
    {/if}
  {/each}
</p>
