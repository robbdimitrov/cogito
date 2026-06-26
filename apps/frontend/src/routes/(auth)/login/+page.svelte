<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import AuthHero from "$lib/domains/auth/components/AuthHero.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import IconInput from "$lib/shared/components/ui/IconInput.svelte";
  import { AlertCircle, Lock, Mail } from "@lucide/svelte";
  import { untrack } from "svelte";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let email = $state(untrack(() => form?.fields?.email ?? ""));
  let password = $state("");
  let pending = $state(false);
</script>

<svelte:head>
  <title>Log in · Cogito</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)]">
  <AuthHero
    eyebrow="Welcome back"
    title="Cogito"
    description="Pick up where the conversation left off."
    points={[
      "Share ideas before they fade",
      "Keep up with people you follow",
      "Return to replies, likes, and reposts",
    ]}
  />

  <div class="flex flex-1 items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <GlassCard>
        <div class="card-body">
          <h1 class="card-title mb-1 text-2xl">Welcome back</h1>
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
            <div class="form-control">
              <label class="label" for="login-email">
                <span class="label-text font-medium">Email</span>
              </label>
              <IconInput
                icon={Mail}
                id="login-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                bind:value={email}
                autocomplete="email"
                required
              />
            </div>
            <div class="form-control">
              <label class="label" for="login-password">
                <span class="label-text font-medium">Password</span>
              </label>
              <IconInput
                icon={Lock}
                id="login-password"
                type="password"
                name="password"
                placeholder="Enter your password"
                bind:value={password}
                autocomplete="current-password"
                minlength={8}
                required
              />
            </div>
            <button
              type="submit"
              class="btn btn-primary w-full gap-1 rounded-xl"
              disabled={pending}
            >
              {#if pending}
                <span class="loading loading-spinner"></span>
              {:else}
                Log In
              {/if}
            </button>
          </form>

          <div class="divider my-4">or</div>
          <p class="text-center text-sm text-base-content/60">
            Don&apos;t have an account?
            <a href={resolve("/signup")} class="link link-primary font-medium"
              >Sign Up</a
            >
          </p>
        </div>
      </GlassCard>
    </div>
  </div>
</div>
