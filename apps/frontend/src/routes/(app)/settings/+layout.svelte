<script lang="ts">
  import { User, Lock, Monitor, Laptop, Sun, Moon } from "@lucide/svelte";
  import { page } from "$app/state";
  import { getThemeContext } from "$lib/shared/theme.svelte";

  let { children } = $props();

  const theme = getThemeContext();

  const settingsLinks = [
    { title: "Profile", href: "/settings/profile", icon: User },
    { title: "Password", href: "/settings/password", icon: Lock },
    { title: "Sessions", href: "/settings/sessions", icon: Monitor },
  ];

  const themeOptions = [
    { label: "System", value: "system", icon: Laptop },
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
  ] as const;
</script>

<div class="mx-auto w-full max-w-5xl px-3 py-3 sm:px-4 sm:py-6">
  <header class="px-1 pb-4 sm:pb-6">
    <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
      Settings
    </h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
      Manage your account, appearance, and security.
    </p>
  </header>

  <div class="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
    <aside class="flex-shrink-0 md:w-64">
      <nav class="flex flex-col gap-1">
        {#each settingsLinks as item}
          <a
            href={item.href}
            class="group flex items-center gap-3 rounded-xl p-3 outline-none transition-colors duration-200 hover:bg-base-200 focus-visible:bg-base-200 {page.url.pathname.startsWith(
              item.href,
            )
              ? 'bg-base-200 font-medium'
              : ''}"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {page.url.pathname.startsWith(
                item.href,
              )
                ? 'bg-primary/20 text-primary'
                : 'bg-base-300 text-base-content/70'}"
            >
              <item.icon class="h-4 w-4" />
            </div>
            <span>{item.title}</span>
          </a>
        {/each}
      </nav>

      <div class="mt-8 px-3">
        <h2
          class="text-xs font-semibold uppercase tracking-wider text-base-content/50"
        >
          Appearance
        </h2>
        <div
          class="mt-3 grid grid-cols-3 rounded-xl bg-base-200/70 p-1 dark:bg-slate-950/60"
          role="radiogroup"
          aria-label="Theme"
        >
          {#each themeOptions as option}
            <button
              type="button"
              role="radio"
              aria-checked={theme.mode === option.value}
              class="btn btn-ghost min-h-10 rounded-lg border-0 px-2 text-xs font-medium {theme.mode ===
              option.value
                ? 'bg-base-100 text-base-content shadow-sm hover:bg-base-100 dark:bg-slate-800'
                : 'text-base-content/60 hover:bg-base-100/60 hover:text-base-content'}"
              onclick={() => theme.set(option.value)}
            >
              <option.icon class="h-3.5 w-3.5" />
            </button>
          {/each}
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      {@render children()}
    </main>
  </div>
</div>
