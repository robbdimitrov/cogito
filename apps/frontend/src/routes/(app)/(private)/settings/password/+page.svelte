<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import { ArrowLeft, AlertCircle } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import Field from "$lib/shared/components/ui/Field.svelte";
  import FormInput from "$lib/shared/components/ui/FormInput.svelte";
  import { pageTitle } from "$lib/shared/pageTitle";
  import { getToastContext } from "$lib/shared/toast.svelte";

  let { form } = $props();

  const toast = getToastContext();
  let isSubmitting = $state(false);
  let oldPassword = $state("");
  let password = $state("");
</script>

<svelte:head>
  <title>{pageTitle("Change Password")}</title>
</svelte:head>

<GlassCard>
  <div class="card-body gap-4 p-4 sm:gap-5 sm:p-6">
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
          Change Password
        </h1>
        <p class="muted-text text-sm">
          Choose a strong password you don't use anywhere else.
        </p>
      </div>
    </div>

    {#if form?.error}
      <div class="alert alert-error" role="alert">
        <AlertCircle class="size-5 shrink-0" aria-hidden="true" />
        <span>{form.error}</span>
      </div>
    {/if}

    <form
      method="POST"
      class="space-y-4 sm:space-y-5"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ result, update }) => {
          isSubmitting = false;
          if (result.type === "success") {
            toast.success("Password updated successfully");
            oldPassword = "";
            password = "";
          }
          await update({ invalidateAll: false });
        };
      }}
    >
      <Field id="current-password" label="Current Password">
        <FormInput
          id="current-password"
          type="password"
          name="oldPassword"
          placeholder="Current password"
          minlength={8}
          maxlength={128}
          bind:value={oldPassword}
          required
          autocomplete="current-password"
        />
      </Field>
      <Field id="new-password" label="New Password">
        <FormInput
          id="new-password"
          type="password"
          name="password"
          placeholder="New password"
          minlength={8}
          maxlength={128}
          bind:value={password}
          required
          autocomplete="new-password"
        />
      </Field>
      <button
        type="submit"
        class="btn btn-primary min-h-12 rounded-xl px-5 text-base"
        disabled={isSubmitting}
      >
        {#if isSubmitting}
          <span class="loading loading-spinner" aria-label="Updating"></span>
        {:else}
          Update Password
        {/if}
      </button>
    </form>
  </div>
</GlassCard>
