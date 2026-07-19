<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import { ArrowLeft, Camera, Trash2, AlertCircle } from "@lucide/svelte";
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

  // Created here rather than in $derived so the cleanup return revokes the
  // previous object URL on every change and on unmount, avoiding a leak.
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

<GlassCard class="overflow-hidden">
  <div class="card-body gap-4 p-4 pb-0 sm:gap-5 sm:p-6 sm:pb-0">
    <div class="subtle-border flex items-start gap-3 border-b pb-4">
      <a
        href={resolve("/settings")}
        class="btn btn-ghost btn-circle btn-sm shrink-0"
        aria-label="Back to Settings"
        title="Back to Settings"
      >
        <ArrowLeft class="size-4" aria-hidden="true" />
      </a>
      <div class="grid gap-0.5">
        <h1 class="text-xl font-semibold leading-tight sm:text-2xl">
          Edit Profile
        </h1>
        <p class="muted-text text-sm">Update your photo, name, and bio.</p>
      </div>
    </div>

    {#if form?.error}
      <div class="alert alert-error mb-4" role="alert">
        <AlertCircle class="size-5 shrink-0" aria-hidden="true" />
        <span>{form.error}</span>
      </div>
    {/if}
  </div>

  <form
    method="POST"
    enctype="multipart/form-data"
    use:enhance={({ formData }) => {
      isSubmitting = true;
      const previousOverride = userOverride;

      if (avatarFile) formData.set("avatar", avatarFile);
      if (coverFile) formData.set("cover", coverFile);

      formData.set("profilePhotoKey", user.profilePhotoKey || "");
      formData.set("coverPhotoKey", user.coverPhotoKey || "");

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
          await update({ invalidateAll: false });
          return;
        }

        toast.success("Profile updated successfully");
        avatarFile = null;
        coverFile = null;
        if (result.type === "success") {
          userOverride = {
            ...userOverride,
            profilePhotoKey: result.data?.profilePhotoKey as string | undefined,
            coverPhotoKey: result.data?.coverPhotoKey as string | undefined,
          };
        }
        await update({ invalidateAll: false });
      };
    }}
  >
    <div class="relative">
      <div
        class="relative h-24 bg-linear-to-tr from-primary via-primary/80 to-secondary sm:h-32"
      >
        {#if coverPreview}
          <img
            src={coverPreview}
            alt="Cover"
            width="768"
            height="128"
            class="absolute inset-0 size-full object-cover"
          />
        {:else}
          <div
            class="absolute inset-0 opacity-10"
            style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px); background-size: 24px 24px;"
          ></div>
        {/if}
        <button
          type="button"
          class="group absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 transition-colors hover:bg-black/40 focus-visible:bg-black/40"
          onclick={() => coverInput.click()}
          aria-label="Change cover photo"
        >
          <Camera
            class="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
          <span
            class="text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            Change cover photo
          </span>
        </button>
        {#if coverPreview}
          <button
            type="button"
            class="btn btn-circle btn-xs absolute right-2 top-2 border-none bg-black/60 text-white hover:bg-error"
            onclick={() => removeImage("cover")}
            aria-label="Remove cover photo"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
          </button>
        {/if}
        <input
          bind:this={coverInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="hidden"
          onchange={(e) => handleImageSelect(e, "cover")}
        />
      </div>

      <div class="absolute left-5 top-24 -translate-y-3/4 sm:left-8 sm:top-32">
        <div
          class="relative rounded-full border border-base-300/80 bg-base-100 p-1 dark:border-base-300/30 dark:bg-base-200"
        >
          {#if avatarFile}
            <div class="size-20 overflow-hidden rounded-full">
              <img
                src={profilePreview}
                alt="Avatar"
                width="80"
                height="80"
                class="size-full object-cover"
              />
            </div>
          {:else}
            <Avatar
              name={user.name}
              size="xl"
              photoKey={user.profilePhotoKey}
            />
          {/if}
          <button
            type="button"
            class="group absolute inset-1 flex items-center justify-center rounded-full bg-black/0 transition-colors hover:bg-black/40 focus-visible:bg-black/40"
            onclick={() => avatarInput.click()}
            aria-label="Change profile photo"
          >
            <Camera
              class="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          </button>
          {#if profilePreview}
            <button
              type="button"
              class="btn btn-circle btn-xs absolute -bottom-1 -right-1 border-none bg-black/60 text-white hover:bg-error"
              onclick={() => removeImage("avatar")}
              aria-label="Remove profile photo"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
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
    </div>

    <div class="card-body gap-4 p-4 pt-10 sm:gap-5 sm:p-6 sm:pt-10">
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
    </div>
  </form>
</GlassCard>
