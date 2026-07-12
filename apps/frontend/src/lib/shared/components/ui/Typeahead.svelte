<script lang="ts">
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Hash } from "@lucide/svelte";

  let {
    items,
    display,
    onselect,
  }: {
    items: unknown[];
    display: (item: unknown) => string;
    onselect: (value: string) => void;
  } = $props();

  function isUserItem(item: unknown): item is {
    name?: string;
    username: string;
    profilePhotoKey?: string;
  } {
    return typeof item === "object" && item !== null && "username" in item;
  }
</script>

{#if items.length > 0}
  <div
    class="z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
  >
    {#each items as item, i (display(item) + i)}
      {@const value = display(item)}
      <button
        type="button"
        class="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-800/80"
        onclick={() => onselect(value)}
      >
        {#if isUserItem(item)}
          {@const user = item}
          <Avatar
            name={user.name ?? user.username}
            size="sm"
            photoKey={user.profilePhotoKey}
          />
          <span class="min-w-0">
            <span
              class="block truncate text-sm font-semibold text-slate-900 dark:text-white"
            >
              {user.name || user.username}
            </span>
            <span
              class="block truncate text-xs text-slate-500 dark:text-slate-400"
            >
              @{user.username}
            </span>
          </span>
        {:else}
          {@const hashtag = item as { name: string; postCount?: number }}
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
          >
            <Hash class="h-4 w-4" />
          </span>
          <span class="min-w-0">
            <span
              class="block truncate text-sm font-semibold text-slate-900 dark:text-white"
            >
              #{hashtag.name}
            </span>
            {#if hashtag.postCount !== undefined}
              <span
                class="block truncate text-xs text-slate-500 dark:text-slate-400"
              >
                {hashtag.postCount}
                {hashtag.postCount === 1 ? "post" : "posts"}
              </span>
            {/if}
          </span>
        {/if}
      </button>
    {/each}
  </div>
{/if}
