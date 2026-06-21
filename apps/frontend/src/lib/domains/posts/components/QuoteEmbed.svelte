<script lang="ts">
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import FormattedContent from "$lib/domains/posts/components/FormattedContent.svelte";
  import { imageUrl } from "$lib/shared/imageUrl";
  import type { Post } from "$lib/shared/types";

  let { post }: { post: Post } = $props();

  let author = $derived(post.user);
</script>

<div
  class="border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-3 mt-2"
>
  <div class="flex items-center gap-2 mb-1.5">
    {#if author}
      <a
        href="/@{author.username}"
        class="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <Avatar
          name={author.name}
          size="sm"
          photoKey={author.profilePhotoKey}
        />
      </a>
    {/if}
    {#if author}
      <div class="flex items-center gap-1.5 min-w-0">
        <a
          href="/@{author.username}"
          class="font-bold text-sm text-slate-900 dark:text-slate-100 hover:underline truncate"
        >
          {author.name}
        </a>
        <a
          href="/@{author.username}"
          class="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors truncate"
        >
          @{author.username}
        </a>
      </div>
    {/if}
  </div>
  <FormattedContent
    content={post.content}
    class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4 break-words"
  />
  {#if post.mediaKey}
    <div class="mt-2">
      <img
        src={imageUrl(post.mediaKey)}
        alt="Quoted post attachment"
        loading="lazy"
        decoding="async"
        class="max-h-40 w-auto rounded-lg object-contain border border-slate-200 dark:border-slate-700"
      />
    </div>
  {/if}
</div>
