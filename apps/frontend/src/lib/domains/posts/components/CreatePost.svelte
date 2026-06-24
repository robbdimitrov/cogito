<script lang="ts">
  import { Pen, Send, ImageIcon, X } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/domains/users/model";

  import { resizeImageForUpload } from "$lib/shared/image";
  import { getToastContext } from "$lib/shared/toast.svelte";
  import { enhance } from "$app/forms";

  let { user } = $props<{ user: User }>();
  let content = $state("");
  let cursorPosition = $state<number | null>(null);
  let suggestions = $state<User[]>([]);
  let searchQuery = $state("");
  let showTypeahead = $state(false);
  let hashtagSuggestions = $state<
    { id: number; name: string; postCount: number }[]
  >([]);
  let hashtagQuery = $state("");
  let showHashtagTypeahead = $state(false);
  let imageBlob = $state<Blob | null>(null);
  let imagePreview = $state<string | null>(null);
  let uploadingImage = $state(false);
  let isPending = $state(false);

  const toast = getToastContext();
  let textareaRef: HTMLTextAreaElement;
  let fileInputRef: HTMLInputElement;

  $effect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 0) {
        try {
          const response = await fetch(
            `/api/users/search?query=${encodeURIComponent(searchQuery)}&limit=5`,
          );
          const res = await response.json();
          suggestions = res.items || [];
          showTypeahead = true;
        } catch {
          suggestions = [];
        }
      } else {
        suggestions = [];
        showTypeahead = false;
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  });

  $effect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (hashtagQuery.length > 0) {
        try {
          const response = await fetch(
            `/api/hashtags/search?query=${encodeURIComponent(hashtagQuery)}&limit=5`,
          );
          const res = await response.json();
          hashtagSuggestions = res.items || [];
          showHashtagTypeahead = true;
        } catch {
          hashtagSuggestions = [];
        }
      } else {
        hashtagSuggestions = [];
        showHashtagTypeahead = false;
      }
    }, 200);
    return () => clearTimeout(delayDebounceFn);
  });

  function handleChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    content = target.value;
    cursorPosition = target.selectionStart;

    const textBeforeCursor = content.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
    if (match) {
      searchQuery = match[1] || "";
      showTypeahead = true;
      // Clear hashtag typeahead when mention is active
      hashtagQuery = "";
      showHashtagTypeahead = false;
    } else {
      searchQuery = "";
      showTypeahead = false;
    }

    const hashtagMatch = textBeforeCursor.match(/(?:^|\s)#([A-Za-z0-9_]*)$/);
    if (hashtagMatch) {
      hashtagQuery = hashtagMatch[1] || "";
      showHashtagTypeahead = true;
      // Clear mention typeahead when hashtag is active
      searchQuery = "";
      showTypeahead = false;
    } else {
      hashtagQuery = "";
      showHashtagTypeahead = false;
    }
  }

  function handleSelectSuggestion(username: string) {
    if (cursorPosition === null) return;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (match) {
      const matchStart = textBeforeCursor.lastIndexOf("@" + match[1]);
      content =
        content.substring(0, matchStart) +
        "@" +
        username +
        " " +
        textAfterCursor;
    }

    showTypeahead = false;
    searchQuery = "";
    textareaRef?.focus();
  }

  function handleSelectHashtag(name: string) {
    if (cursorPosition === null) return;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const match = textBeforeCursor.match(/(?:^|\s)#([A-Za-z0-9_]*)$/);

    if (match) {
      const matchStart = textBeforeCursor.lastIndexOf("#" + match[1]);
      content =
        content.substring(0, matchStart) + "#" + name + " " + textAfterCursor;
    }

    showHashtagTypeahead = false;
    hashtagQuery = "";
    textareaRef?.focus();
  }

  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploadingImage = true;
    try {
      const resized = await resizeImageForUpload(file);
      imageBlob = resized;
      imagePreview = URL.createObjectURL(resized);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to attach image");
    } finally {
      uploadingImage = false;
      target.value = "";
    }
  }

  $effect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  });
</script>

<GlassCard>
  <div class="card-body p-4 sm:p-5">
    <form
      method="POST"
      action="?/createPost"
      enctype="multipart/form-data"
      use:enhance={({ formData }) => {
        isPending = true;
        if (imageBlob) {
          formData.set("image", imageBlob, "upload.jpg");
        }
        return async ({ result, update }) => {
          isPending = false;
          if (result.type === "success") {
            content = "";
            imageBlob = null;
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            imagePreview = null;
            showTypeahead = false;
            showHashtagTypeahead = false;
            hashtagQuery = "";
            hashtagSuggestions = [];
            await update();
          } else if (result.type === "failure") {
            toast.error((result.data as Record<string, unknown>)?.error as string || "Failed to post");
          }
        };
      }}
    >
      <div class="flex gap-3 sm:gap-4">
        <div class="hidden shrink-0 sm:block">
          <Avatar
            name={user?.name}
            size="md"
            photoKey={user?.profilePhotoKey}
          />
        </div>
        <div class="relative flex-1 min-w-0">
          <Pen
            class="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-500 dark:text-slate-400"
          />
          <textarea
            bind:this={textareaRef}
            name="content"
            class="textarea border-slate-200/70 focus:border-primary/60 focus:ring-primary/10 dark:border-slate-700/70 dark:bg-slate-950/35 dark:focus:bg-slate-950/60 w-full resize-none rounded-2xl bg-white/55 pl-10 text-base leading-relaxed shadow-inner shadow-slate-900/5 transition-all duration-300 focus:bg-white/80 focus:ring-4 sm:text-lg"
            placeholder="What's on your mind?"
            value={content}
            oninput={handleChange}
            onclick={handleChange}
            onkeyup={handleChange}
            rows={3}
            maxlength={255}></textarea>
          {#if showTypeahead && suggestions.length > 0}
            <div
              class="absolute left-0 top-[105%] z-10 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
            >
              {#each suggestions as u (u.id)}
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-800/80"
                  onclick={() => handleSelectSuggestion(u.username)}
                >
                  <Avatar
                    name={u.name}
                    size="sm"
                    photoKey={u.profilePhotoKey}
                  />
                  <div class="overflow-hidden">
                    <div
                      class="truncate text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      {u.name}
                    </div>
                    <div
                      class="truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      @{u.username}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
          {#if showHashtagTypeahead && hashtagSuggestions.length > 0}
            <div
              class="absolute left-0 top-[105%] z-10 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
            >
              {#each hashtagSuggestions as h (h.id)}
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-800/80"
                  onclick={() => handleSelectHashtag(h.name)}
                >
                  <div class="overflow-hidden">
                    <div
                      class="truncate text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      #{h.name}
                    </div>
                    <div
                      class="truncate text-xs text-slate-500 dark:text-slate-400"
                    >
                      {h.postCount}
                      {h.postCount === 1 ? "post" : "posts"}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      {#if imagePreview}
        <div class="mt-3 sm:pl-14">
          <div class="relative inline-block">
            <img
              src={imagePreview}
              alt="Attached"
              class="max-h-60 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
            />
            <button
              type="button"
              onclick={() => {
                imageBlob = null;
                imagePreview = null;
              }}
              class="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/if}
      <div class="mt-3 flex items-center justify-between sm:pl-14">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm text-slate-500 transition-colors hover:text-primary"
            onclick={() => fileInputRef?.click()}
            disabled={uploadingImage}
            title="Attach image"
          >
            {#if uploadingImage}
              <span class="loading loading-spinner loading-xs"></span>
            {:else}
              <ImageIcon class="h-5 w-5" />
            {/if}
          </button>
          <input
            bind:this={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            class="hidden"
            onchange={handleImageUpload}
          />

          <span
            class="text-sm {content.length > 240
              ? 'text-warning'
              : 'text-slate-500 dark:text-slate-400'}"
            >{content.length}/255</span
          >
        </div>
        <button
          type="submit"
          class="btn btn-primary btn-sm gap-1 rounded-full px-5 {!isPending &&
          (content.trim() || imageBlob)
            ? 'shadow-lg shadow-primary/20'
            : 'shadow-none'}"
          disabled={isPending || (!content.trim() && !imageBlob)}
        >
          <Send class="h-4 w-4" />
          Post
        </button>
      </div>
    </form>
  </div>
</GlassCard>
