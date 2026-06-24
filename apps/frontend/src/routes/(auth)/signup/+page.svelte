<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import AuthHero from "$lib/domains/auth/components/AuthHero.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import IconInput from "$lib/shared/components/ui/IconInput.svelte";
  import { AlertCircle, Lock, Mail, User, UserPlus } from "@lucide/svelte";
  import { untrack } from "svelte";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();
  let name = $state(untrack(() => form?.fields?.name ?? ""));
  let username = $state(untrack(() => form?.fields?.username ?? ""));
  let email = $state(untrack(() => form?.fields?.email ?? ""));
  let password = $state("");
  let pending = $state(false);
  const usernameValid = $derived(!username || /^[a-zA-Z0-9_]+$/.test(username));
  const passwordValid = $derived(!password || password.length >= 8);
</script>

<svelte:head>
  <title>Sign up · Cogito</title>
</svelte:head>

<div class="flex min-h-[calc(100vh-4rem)]">
  <AuthHero
    eyebrow="Start here"
    title="Cogito"
    description="Create a space for quick ideas and real conversations."
    points={[
      "Claim your profile and username",
      "Post cogito as they happen",
      "Find people worth following",
    ]}
  />

  <div class="flex flex-1 items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <GlassCard>
        <div class="card-body">
          <h1 class="card-title mb-1 text-2xl">Create your account</h1>
          <p class="mb-6 text-base-content/60">
            Set up your profile and start posting.
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
              <label class="label" for="signup-name">
                <span class="label-text font-medium">Name</span>
              </label>
              <IconInput
                icon={User}
                id="signup-name"
                name="name"
                placeholder="Your name"
                bind:value={name}
                autocomplete="name"
                required
              />
            </div>
            <div class="form-control">
              <label class="label" for="signup-username">
                <span class="label-text font-medium">Username</span>
              </label>
              <IconInput
                icon={User}
                id="signup-username"
                name="username"
                placeholder="@username"
                bind:value={username}
                autocomplete="username"
                pattern="[a-zA-Z0-9_]+"
                required
              />
              {#if !usernameValid}
                <span class="label-text-alt mt-1 text-error">
                  Letters, numbers, underscores only
                </span>
              {/if}
            </div>
            <div class="form-control">
              <label class="label" for="signup-email">
                <span class="label-text font-medium">Email</span>
              </label>
              <IconInput
                icon={Mail}
                id="signup-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                bind:value={email}
                autocomplete="email"
                required
              />
            </div>
            <div class="form-control">
              <label class="label" for="signup-password">
                <span class="label-text font-medium">Password</span>
              </label>
              <IconInput
                icon={Lock}
                id="signup-password"
                type="password"
                name="password"
                placeholder="Enter your password"
                bind:value={password}
                autocomplete="new-password"
                minlength={8}
                required
              />
              {#if !passwordValid}
                <span class="label-text-alt mt-1 text-error"
                  >At least 8 characters</span
                >
              {/if}
            </div>
            <button
              type="submit"
              class="btn btn-primary w-full gap-1 rounded-xl"
              disabled={pending || !usernameValid || !passwordValid}
            >
              {#if pending}
                <span class="loading loading-spinner"></span>
              {:else}
                <UserPlus class="size-4" aria-hidden="true" />
                Create account
              {/if}
            </button>
          </form>

          <div class="divider my-4">or</div>
          <p class="text-center text-sm text-base-content/60">
            Already have an account?
            <a href={resolve("/login")} class="link link-primary font-medium"
              >Log In</a
            >
          </p>
        </div>
      </GlassCard>
    </div>
  </div>
</div>
