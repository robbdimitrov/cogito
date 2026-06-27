<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Pathname } from "$app/types";

  interface Props {
    content: string;
    class?: string;
  }

  let { content, class: className = "" }: Props = $props();

  type Token =
    | { type: "text"; text: string; id: string }
    | { type: "url"; url: string; id: string }
    | { type: "hashtag"; tag: string; href: string; id: string }
    | { type: "mention"; handle: string; href: string; id: string };

  let tokens = $derived.by(() => {
    const result: Token[] = [];
    let lastIndex = 0;
    const tokenRegex =
      /(https?:\/\/[^\s]+)|(^|[^A-Za-z0-9_])([#@])([A-Za-z0-9_]{1,50})/g;
    const matches = Array.from(content.matchAll(tokenRegex));

    for (const match of matches) {
      if (match[1]) {
        let url = match[1];
        const matchStart = match.index!;

        const punctuationMatch = url.match(/[.,;:?!"']+$/);
        if (punctuationMatch) {
          url = url.slice(0, -punctuationMatch[0].length);
        }

        if (matchStart > lastIndex) {
          result.push({
            type: "text",
            text: content.slice(lastIndex, matchStart),
            id: `text-${lastIndex}`,
          });
        }
        result.push({ type: "url", url, id: `url-${matchStart}` });
        lastIndex = matchStart + url.length;
      } else {
        const [fullMatch, , prefix, symbol, tagOrUser] = match;
        const matchStart = match.index! + (prefix || "").length;

        if (matchStart > lastIndex) {
          result.push({
            type: "text",
            text: content.slice(lastIndex, matchStart),
            id: `text-${lastIndex}`,
          });
        }

        const tagOrUserStr = tagOrUser || "";
        if (symbol === "#") {
          result.push({
            type: "hashtag",
            tag: tagOrUserStr,
            href: `/hashtags/${encodeURIComponent(tagOrUserStr.toLowerCase())}`,
            id: `hashtag-${matchStart}`,
          });
        } else if (symbol === "@") {
          result.push({
            type: "mention",
            handle: tagOrUserStr,
            href: `/@${encodeURIComponent(tagOrUserStr)}`,
            id: `mention-${matchStart}`,
          });
        }

        lastIndex = match.index! + fullMatch.length;
      }
    }

    if (lastIndex < content.length) {
      result.push({
        type: "text",
        text: content.slice(lastIndex),
        id: `text-${lastIndex}`,
      });
    }

    return result;
  });
</script>

<p class={className}>
  {#if tokens.length > 0}
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
  {:else}
    {content}
  {/if}
</p>
