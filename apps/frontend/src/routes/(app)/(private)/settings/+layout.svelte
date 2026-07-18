<script lang="ts">
  import { Laptop, Sun, Moon, LogOut } from "@lucide/svelte";
  import { page } from "$app/state";
  import { getThemeContext } from "$lib/shared/theme.svelte";
  import TabStrip from "$lib/shared/components/ui/TabStrip.svelte";

  let { children } = $props();

  const theme = getThemeContext();

  const settingsLinks = [
    { title: "Profile", href: "/settings/profile" },
    { title: "Password", href: "/settings/password" },
    { title: "Sessions", href: "/settings/sessions" },
  ];

  let tabs = $derived(
    settingsLinks.map((item) => ({
      name: item.title,
      href: item.href,
      isActive: page.url.pathname.startsWith(item.href),
    })),
  );

  const themeOptions = [
    { label: "System", value: "system", icon: Laptop },
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
  ] as const;
</script>

<div class="page-shell w-full">
  <header class="px-1 pb-4 sm:pb-6">
    <h1 class="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
      Settings
    </h1>
    <p class="muted-text mt-1 text-sm sm:text-base">
      Manage your account, appearance, and security.
    </p>
  </header>

  <div class="flex flex-wrap items-center justify-between gap-4">
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
          class="btn btn-ghost min-h-10 rounded-lg border-0 px-2 text-xs font-medium {theme.mode ===
          option.value
            ? 'bg-base-100 text-base-content shadow-sm hover:bg-base-100'
            : 'opacity-60 hover:bg-base-100/60 hover:text-base-content hover:opacity-100'}"
          onclick={() => theme.set(option.value)}
        >
          <option.icon class="h-3.5 w-3.5" />
        </button>
      {/each}
    </div>

    <form method="POST" action="/logout">
      <button
        type="submit"
        class="group flex items-center gap-3 rounded-xl p-3 text-error outline-none transition-colors duration-200 hover:bg-error/10 focus-visible:bg-error/10"
      >
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error"
        >
          <LogOut class="size-4" />
        </div>
        <span>Log out</span>
      </button>
    </form>
  </div>

  <TabStrip {tabs} />

  <main class="mt-6">
    {@render children()}
  </main>
</div>
