<script lang="ts">
  import { resolve } from "$app/paths";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import FormattedContent from "$lib/domains/posts/components/FormattedContent.svelte";
  import { imageUrl } from "$lib/shared/imageUrl";
  import type { Post } from "$lib/shared/types";

  let { post }: { post: Post } = $props();

  let author = $derived(post.user);
</script>

<div class="soft-surface mt-2 rounded-xl p-3">
  <div class="flex items-center gap-2 mb-1.5">
    {#if author}
      <a
        href={resolve(`/@${author.username}`)}
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
          href={resolve(`/@${author.username}`)}
          class="truncate text-sm font-bold text-base-content hover:underline"
        >
          {author.name}
        </a>
        <a
          href={resolve(`/@${author.username}`)}
          class="muted-text truncate text-xs transition-colors hover:text-base-content/80"
        >
          @{author.username}
        </a>
      </div>
    {/if}
  </div>
  <FormattedContent
    content={post.content}
    class="line-clamp-4 wrap-break-word text-sm leading-relaxed text-base-content/75"
  />
  {#if post.mediaKey}
    <div class="mt-2">
      <img
        src={imageUrl(post.mediaKey)}
        alt="Quoted post attachment"
        loading="lazy"
        decoding="async"
        class="max-h-40 w-auto rounded-lg border border-base-300 object-contain dark:border-white/10"
      />
    </div>
  {/if}
</div>
