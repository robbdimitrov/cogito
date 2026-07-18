<script lang="ts">
  import { resolve } from "$app/paths";
  import { Hash, X } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import PostItem from "$lib/domains/posts/components/PostItem.svelte";
  import type { BlendedItem } from "./types";
  import type { Post } from "$lib/domains/posts/model";

  interface Props {
    result: BlendedItem;
    compact?: boolean;
    currentUserId?: number | null;
    onQuote?: (post: Post) => void;
    onSelect?: () => void;
    onRemove?: () => void;
  }

  let {
    result,
    compact = false,
    currentUserId,
    onQuote,
    onSelect,
    onRemove,
  }: Props = $props();
</script>

{#snippet removeButton()}
  {#if onRemove}
    <button
      type="button"
      class="grid size-8 shrink-0 place-items-center rounded-full text-base-content opacity-60 outline-none hover:bg-base-300 hover:opacity-100 focus-visible:bg-base-300 focus-visible:opacity-100"
      aria-label="Remove from recent searches"
      onclick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove?.();
      }}
    >
      <X class="size-4" />
    </button>
  {/if}
{/snippet}

{#snippet userRow(entry: Extract<BlendedItem, { type: "users" }>)}
  {@const user = entry.item}
  <div class="soft-surface flex items-center gap-3 p-4">
    <a
      href={resolve(`/@${user.username}`)}
      class="flex min-w-0 flex-1 items-center gap-3"
      onclick={onSelect}
    >
      <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
      <span class="min-w-0">
        <span class="block truncate font-semibold text-base-content">
          {user.name}
        </span>
        <span class="muted-text block truncate text-sm">@{user.username}</span>
      </span>
    </a>
    {@render removeButton()}
  </div>
{/snippet}

{#snippet hashtagRow(entry: Extract<BlendedItem, { type: "hashtags" }>)}
  {@const hashtag = entry.item}
  <div class="soft-surface flex items-center gap-3 p-4">
    <a
      href={resolve(
        `/search?${new URLSearchParams({ q: `#${hashtag.name}` })}`,
      )}
      class="flex min-w-0 flex-1 items-center justify-between gap-3"
      onclick={onSelect}
    >
      <span class="flex min-w-0 items-center gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <Hash class="size-5" />
        </span>
        <span class="truncate font-semibold text-primary">#{hashtag.name}</span>
      </span>
      <span class="muted-text shrink-0 text-sm">
        {hashtag.postCount}
        {hashtag.postCount === 1 ? "post" : "posts"}
      </span>
    </a>
    {@render removeButton()}
  </div>
{/snippet}

{#if result.type === "users"}
  {#if compact}
    {@render userRow(result)}
  {:else}
    <li>{@render userRow(result)}</li>
  {/if}
{:else if result.type === "hashtags"}
  {#if compact}
    {@render hashtagRow(result)}
  {:else}
    <li>{@render hashtagRow(result)}</li>
  {/if}
{:else if compact}
  <a
    href={resolve(`/posts/${result.item.id}`)}
    class="block truncate rounded-xl px-3 py-2 text-sm text-base-content/75 hover:bg-base-200"
    onclick={onSelect}
  >
    {result.item.content}
  </a>
{:else}
  <PostItem post={result.item} {currentUserId} {onQuote} />
{/if}
