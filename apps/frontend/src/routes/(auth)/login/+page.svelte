<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import AuthShell from "$lib/shared/components/layout/AuthShell.svelte";
  import Field from "$lib/shared/components/ui/Field.svelte";
  import FormInput from "$lib/shared/components/ui/FormInput.svelte";
  import { pageTitle } from "$lib/shared/pageTitle";
  import { AlertCircle } from "@lucide/svelte";
  import { untrack } from "svelte";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let email = $state(untrack(() => form?.fields?.email ?? ""));
  let password = $state("");
  let showPassword = $state(false);
  let pending = $state(false);
</script>

<svelte:head>
  <title>{pageTitle("Log in")}</title>
</svelte:head>

<AuthShell
  eyebrow="Welcome back"
  heading="Log in to Cogito"
  description="Log in to keep the conversation moving."
>
  {#if form?.error}
    <div class="alert alert-error mb-4">
      <AlertCircle class="size-5" aria-hidden="true" />
      <span>{form.error}</span>
    </div>
  {/if}

  <form
    method="POST"
    class="space-y-4"
    use:enhance={() => {
      pending = true;
      return async ({ update }) => {
        pending = false;
        await update();
      };
    }}
  >
    <Field id="login-email" label="Email">
      <FormInput
        id="login-email"
        type="email"
        name="email"
        placeholder="you@example.com"
        bind:value={email}
        autocomplete="email"
        maxlength={255}
        required
      />
    </Field>
    <Field id="login-password" label="Password">
      <div class="relative">
        <FormInput
          id="login-password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Enter your password"
          class="pr-16"
          bind:value={password}
          autocomplete="current-password"
          maxlength={128}
          required
        />
        <button
          type="button"
          class="btn btn-ghost btn-sm absolute top-1/2 right-1 -translate-y-1/2"
          onclick={() => (showPassword = !showPassword)}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
    </Field>
    <button
      type="submit"
      class="btn btn-primary w-full gap-1 rounded-xl"
      disabled={pending}
    >
      {#if pending}
        <span class="loading loading-spinner" aria-label="Logging in"></span>
      {:else}
        Log In
      {/if}
    </button>
  </form>

  <p class="mt-4 text-center text-sm text-base-content/60">
    Don&apos;t have an account?
    <a href={resolve("/register")} class="link link-primary font-medium"
      >Register</a
    >
  </p>
</AuthShell>
