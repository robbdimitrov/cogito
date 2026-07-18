<script lang="ts">
  import { Pen, Send, ImageIcon, X } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/domains/users/model";

  import { resizeImageForUpload } from "$lib/shared/image";
  import { getToastContext } from "$lib/shared/toast.svelte";
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";

  let { user, onClose } = $props<{
    user: User;
    onClose: () => void;
  }>();
  let content = $state("");
  let imageBlob = $state<Blob | null>(null);
  let imagePreview = $state<string | null>(null);
  let uploadingImage = $state(false);
  let isPending = $state(false);

  const toast = getToastContext();
  let textareaRef: HTMLTextAreaElement | undefined = $state();
  let fileInputRef: HTMLInputElement | undefined = $state();

  $effect(() => {
    textareaRef?.focus();
  });

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

<GlassCard class="relative">
  <div class="card-body p-5 sm:p-6">
    <button
      type="button"
      class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3 z-10"
      onclick={onClose}
      aria-label="Close"
    >
      <X class="h-4 w-4" aria-hidden="true" />
    </button>
    <form
      method="POST"
      action={`${resolve("/")}?/createPost`}
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
            await update();
            onClose();
          } else if (result.type === "failure") {
            toast.error(
              ((result.data as Record<string, unknown>)?.error as string) ||
                "Failed to post",
            );
          }
        };
      }}
    >
      <div class="flex gap-3 pr-10 sm:gap-4">
        <div class="hidden shrink-0 sm:block">
          <Avatar name={user?.name} size="md" photoKey={user?.profilePhotoKey} />
        </div>
        <div class="relative min-w-0 flex-1">
          <Pen
            class="pointer-events-none absolute left-3 top-3.5 h-5 w-5 opacity-60"
          />
          <textarea
            bind:this={textareaRef}
            name="content"
            class="form-textarea min-h-0 resize-none rounded-2xl pl-10 shadow-inner shadow-black/5 sm:text-lg"
            placeholder="What's on your mind?"
            bind:value={content}
            rows={5}
            maxlength={255}></textarea>
        </div>
      </div>
      {#if imagePreview}
        <div class="mt-3 sm:pl-14">
          <div class="relative inline-block">
            <img
              src={imagePreview}
              alt="Attached"
              class="max-h-60 rounded-xl border border-base-300 object-cover dark:border-white/10"
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
            class="btn btn-circle btn-ghost btn-sm opacity-60 transition-colors hover:text-primary hover:opacity-100"
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
              : 'muted-text'}">{content.length}/255</span
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
