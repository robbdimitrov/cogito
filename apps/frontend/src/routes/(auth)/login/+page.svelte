<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import Field from "$lib/shared/components/ui/Field.svelte";
  import FormInput from "$lib/shared/components/ui/FormInput.svelte";
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
  <title>Log in · Cogito</title>
</svelte:head>

<div
  class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12"
>
  <div class="w-full max-w-md">
    <GlassCard>
      <div class="card-body">
        <span
          class="text-xs font-semibold uppercase tracking-wider text-base-content/50"
          >Welcome back</span
        >
        <h1 class="card-title mt-1 mb-1 text-2xl">Log in to Cogito</h1>
        <p class="mb-6 text-base-content/60">
          Log in to keep the conversation moving.
        </p>

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
              <span class="loading loading-spinner" aria-label="Logging in"
              ></span>
            {:else}
              Log In
            {/if}
          </button>
        </form>

        <div class="divider my-4">or</div>
        <p class="text-center text-sm text-base-content/60">
          Don&apos;t have an account?
          <a href={resolve("/register")} class="link link-primary font-medium"
            >Register</a
          >
        </p>
      </div>
    </GlassCard>
  </div>
</div>
