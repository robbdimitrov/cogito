<script lang="ts">
  import { enhance } from "$app/forms";
  import { Trash2, AlertCircle } from "@lucide/svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import Field from "$lib/shared/components/ui/Field.svelte";
  import FormInput from "$lib/shared/components/ui/FormInput.svelte";
  import FormTextarea from "$lib/shared/components/ui/FormTextarea.svelte";
  import { resizeImageForUpload } from "$lib/shared/image";
  import { imageUrl } from "$lib/shared/imageUrl";
  import { getToastContext } from "$lib/shared/toast.svelte";
  import { untrack } from "svelte";

  let { data, form } = $props();

  const toast = getToastContext();

  let isSubmitting = $state(false);

  let avatarFile: File | null = $state(null);
  let coverFile: File | null = $state(null);
  let bio = $state(untrack(() => data.currentUser?.bio ?? ""));

  let userOverride = $state<Partial<typeof data.currentUser>>({});
  let user = $derived({ ...data.currentUser!, ...userOverride });

  // Track visual state of images before upload. Object URLs are created here
  // (not in $derived) so the cleanup return revokes the previous URL on every
  // change and on unmount, avoiding a blob URL leak.
  let profilePreview = $state("");
  $effect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      profilePreview = url;
      return () => URL.revokeObjectURL(url);
    }
    profilePreview = user.profilePhotoKey
      ? imageUrl(user.profilePhotoKey, "thumb")
      : "";
  });

  let coverPreview = $state("");
  $effect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      coverPreview = url;
      return () => URL.revokeObjectURL(url);
    }
    coverPreview = user.coverPhotoKey ? imageUrl(user.coverPhotoKey) : "";
  });

  let avatarInput: HTMLInputElement;
  let coverInput: HTMLInputElement;

  async function handleImageSelect(event: Event, type: "avatar" | "cover") {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageForUpload(file);
      if (type === "avatar") {
        avatarFile = resized;
      } else {
        coverFile = resized;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to process image");
    } finally {
      target.value = "";
    }
  }

  function removeImage(type: "avatar" | "cover") {
    if (type === "avatar") {
      avatarFile = null;
      if (userOverride) userOverride.profilePhotoKey = "";
    } else {
      coverFile = null;
      if (userOverride) userOverride.coverPhotoKey = "";
    }
  }
</script>

<GlassCard>
  <div class="card-body gap-4 p-4 sm:gap-5 sm:p-6">
    <h1 class="text-xl font-semibold leading-tight sm:text-2xl">
      Edit Profile
    </h1>

    {#if form?.error}
      <div class="alert alert-error" role="alert">
        <AlertCircle class="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{form.error}</span>
      </div>
    {/if}

    <form
      method="POST"
      enctype="multipart/form-data"
      class="space-y-4 sm:space-y-5"
      use:enhance={({ formData }) => {
        isSubmitting = true;
        const previousOverride = userOverride;

        if (avatarFile) formData.set("avatar", avatarFile);
        if (coverFile) formData.set("cover", coverFile);

        formData.set("profilePhotoKey", user.profilePhotoKey || "");
        formData.set("coverPhotoKey", user.coverPhotoKey || "");

        // Optimistic UI for text fields
        userOverride = {
          ...userOverride,
          name: formData.get("name") as string,
          username: formData.get("username") as string,
          email: formData.get("email") as string,
          bio: formData.get("bio") as string,
        };

        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === "failure") {
            userOverride = previousOverride;
            return;
          }

          toast.success("Profile updated successfully");
          avatarFile = null;
          coverFile = null;
          if (result.type === "success") {
            userOverride = {
              ...userOverride,
              profilePhotoKey: result.data?.profilePhotoKey as
                | string
                | undefined,
              coverPhotoKey: result.data?.coverPhotoKey as string | undefined,
            };
          }
          await update({ invalidateAll: false });
        };
      }}
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Field id="settings-avatar" label="Profile Photo">
          <div class="flex items-center gap-3">
            {#if avatarFile}
              <div
                class="relative h-14 w-14 overflow-hidden rounded-full border border-base-content/10"
              >
                <img
                  src={profilePreview}
                  alt="Avatar"
                  width="56"
                  height="56"
                  class="h-full w-full object-cover"
                />
              </div>
            {:else}
              <Avatar name={user.name} size="lg" photoKey={user.profilePhotoKey} />
            {/if}
            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onclick={() => avatarInput.click()}
              >
                Change
              </button>
              {#if profilePreview}
                <button
                  type="button"
                  class="btn btn-ghost btn-sm text-error"
                  onclick={() => removeImage("avatar")}
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
            <input
              bind:this={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              onchange={(e) => handleImageSelect(e, "avatar")}
            />
          </div>
        </Field>

        <Field id="settings-cover" label="Cover Photo">
          <div class="flex items-center gap-3">
            {#if coverPreview}
              <div
                class="relative h-16 w-32 overflow-hidden rounded-lg border border-base-content/10"
              >
                <img
                  src={coverPreview}
                  alt="Cover"
                  width="128"
                  height="64"
                  class="h-full w-full object-cover"
                />
              </div>
            {:else}
              <div
                class="h-16 w-32 rounded-lg border border-base-content/10 bg-linear-to-tr from-primary via-primary/80 to-secondary"
              ></div>
            {/if}
            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onclick={() => coverInput.click()}
              >
                Change
              </button>
              {#if coverPreview}
                <button
                  type="button"
                  class="btn btn-ghost btn-sm text-error"
                  onclick={() => removeImage("cover")}
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
            <input
              bind:this={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              onchange={(e) => handleImageSelect(e, "cover")}
            />
          </div>
        </Field>
      </div>

      <Field id="settings-name" label="Name">
        <FormInput
          id="settings-name"
          type="text"
          name="name"
          placeholder="Name"
          value={user.name}
          required
          autocomplete="name"
          maxlength={100}
        />
      </Field>
      <Field id="settings-username" label="Username">
        <FormInput
          id="settings-username"
          type="text"
          name="username"
          placeholder="Username"
          value={user.username}
          required
          autocomplete="username"
          pattern="[a-zA-Z0-9_]+"
          minlength={3}
          maxlength={30}
        />
      </Field>
      <Field id="settings-email" label="Email">
        <FormInput
          id="settings-email"
          type="email"
          name="email"
          placeholder="Email"
          value={user.email}
          required
          autocomplete="email"
          maxlength={255}
        />
      </Field>
      <Field id="settings-bio" label="Bio">
        <FormTextarea
          id="settings-bio"
          name="bio"
          placeholder="Tell us about yourself"
          bind:value={bio}
          rows={4}
          maxlength={255}
        />
        <span
          class="mt-1 block text-right text-xs {bio.length > 240
            ? 'text-warning'
            : 'muted-text'}">{bio.length}/255</span
        >
      </Field>

      <button
        type="submit"
        class="btn btn-primary min-h-12 rounded-xl px-5 text-base"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <span class="loading loading-spinner" aria-label="Saving"></span>
        {:else}
          Save Changes
        {/if}
      </button>
    </form>
  </div>
</GlassCard>
