<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    User,
    Lock,
    Monitor,
    Laptop,
    Sun,
    Moon,
    LogOut,
    ChevronRight,
  } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { getThemeContext } from "$lib/shared/theme.svelte";

  const theme = getThemeContext();

  const themeOptions = [
    { label: "System", value: "system", icon: Laptop },
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
  ] as const;

  const links = [
    { title: "Profile", href: "/settings/profile", icon: User },
    { title: "Password", href: "/settings/password", icon: Lock },
    { title: "Sessions", href: "/settings/sessions", icon: Monitor },
  ] as const;
</script>

<GlassCard>
  <div class="card-body gap-5 p-4 sm:p-6">
    <div class="grid gap-1">
      <h1 class="text-xl font-semibold leading-tight sm:text-2xl">Settings</h1>
      <p class="muted-text text-sm">
        Manage your account, appearance, and security.
      </p>
    </div>

    <div class="grid gap-2">
      <h2 class="text-sm font-medium text-base-content/60">Appearance</h2>
      <div
        class="grid grid-cols-3 rounded-xl border border-transparent bg-base-200/70 p-1 dark:border-white/15 dark:bg-base-200/70"
        role="radiogroup"
        aria-label="Theme"
      >
        {#each themeOptions as option (option.value)}
          <button
            type="button"
            role="radio"
            aria-checked={theme.mode === option.value}
            class="btn btn-ghost min-h-10 gap-1.5 rounded-lg border-0 px-2 text-xs font-medium {theme.mode ===
            option.value
              ? 'bg-base-100 text-base-content shadow-sm hover:bg-base-100'
              : 'opacity-60 hover:bg-base-100/60 hover:text-base-content hover:opacity-100'}"
            onclick={() => theme.set(option.value)}
          >
            <option.icon class="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="grid gap-2">
      <h2 class="text-sm font-medium text-base-content/60">Account</h2>
      <ul class="grid gap-2" aria-label="Settings sections">
        {#each links as item (item.href)}
          <li>
            <a
              href={resolve(item.href)}
              class="group flex items-center gap-3 rounded-2xl border border-base-300/80 bg-base-100/70 p-4 outline-none transition-colors hover:bg-base-100/90 focus-visible:bg-base-100/90 dark:border-white/15 dark:bg-base-200/70 dark:hover:border-white/25 dark:hover:bg-base-300/85 dark:focus-visible:border-white/25 dark:focus-visible:bg-base-300/85"
            >
              <span
                class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
              >
                <item.icon class="size-5" aria-hidden="true" />
              </span>
              <span class="flex-1 text-sm font-semibold">{item.title}</span>
              <ChevronRight
                class="size-4 opacity-40 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          </li>
        {/each}
      </ul>
    </div>

    <div class="subtle-border border-t pt-5">
      <form method="POST" action="/logout">
        <button
          type="submit"
          class="group flex w-full items-center gap-3 rounded-2xl border border-error/20 bg-error/5 p-4 text-error outline-none transition-colors hover:border-error/30 hover:bg-error/10 focus-visible:border-error/30 focus-visible:bg-error/10 dark:hover:border-error/50 dark:hover:bg-error/20 dark:focus-visible:border-error/50 dark:focus-visible:bg-error/20"
        >
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-error/10 text-error"
          >
            <LogOut class="size-5" aria-hidden="true" />
          </span>
          <span class="text-sm font-semibold">Log out</span>
        </button>
      </form>
    </div>
  </div>
</GlassCard>
