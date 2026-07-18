<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import AuthShell from "$lib/shared/components/layout/AuthShell.svelte";
  import Field from "$lib/shared/components/ui/Field.svelte";
  import FormInput from "$lib/shared/components/ui/FormInput.svelte";
  import { AlertCircle } from "@lucide/svelte";
  import { untrack } from "svelte";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let name = $state(untrack(() => form?.fields?.name ?? ""));
  let username = $state(untrack(() => form?.fields?.username ?? ""));
  let email = $state(untrack(() => form?.fields?.email ?? ""));
  let password = $state("");
  let showPassword = $state(false);
  let pending = $state(false);
</script>

<svelte:head>
  <title>Register · Cogito</title>
</svelte:head>

<AuthShell
  eyebrow="Join Cogito"
  heading="Create your account"
  description="Set up your profile and start posting."
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
    <Field id="register-name" label="Name">
      <FormInput
        id="register-name"
        name="name"
        placeholder="Your name"
        bind:value={name}
        autocomplete="name"
        maxlength={100}
        required
      />
    </Field>
    <Field id="register-username" label="Username">
      <FormInput
        id="register-username"
        name="username"
        placeholder="username"
        bind:value={username}
        autocomplete="username"
        pattern="[a-zA-Z0-9_]+"
        minlength={3}
        maxlength={30}
        required
      />
    </Field>
    <Field id="register-email" label="Email">
      <FormInput
        id="register-email"
        type="email"
        name="email"
        placeholder="you@example.com"
        bind:value={email}
        autocomplete="email"
        pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
        maxlength={255}
        required
      />
    </Field>
    <Field id="register-password" label="Password">
      <div class="relative">
        <FormInput
          id="register-password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Enter your password"
          class="pr-16"
          bind:value={password}
          autocomplete="new-password"
          minlength={8}
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
        <span class="loading loading-spinner" aria-label="Creating account"
        ></span>
      {:else}
        Create account
      {/if}
    </button>
  </form>

  <div class="divider my-4">or</div>
  <p class="text-center text-sm text-base-content/60">
    Already have an account?
    <a href={resolve("/login")} class="link link-primary font-medium">Log In</a>
  </p>
</AuthShell>
