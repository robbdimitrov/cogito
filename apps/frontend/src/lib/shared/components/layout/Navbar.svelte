<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { User } from "$lib/domains/users/model";
  import { getThemeContext } from "$lib/shared/theme.svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import {
    Home,
    LogOut,
    Moon,
    Bell,
    Search,
    Settings,
    Sun,
    User as UserIcon,
  } from "@lucide/svelte";
  import { onMount } from "svelte";

  let {
    user = null,
    sessionUnavailable = false,
    unreadCount = 0,
  }: {
    user?: User | null;
    sessionUnavailable?: boolean;
    unreadCount?: number;
  } = $props();

  const theme = getThemeContext();
  let menuOpen = $state(false);
  let menu = $state<HTMLDivElement>();

  function toggleTheme(): void {
    theme.set(theme.resolved === "light" ? "dark" : "light");
  }

  onMount(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuOpen && menu && !menu.contains(event.target as Node)) {
        menuOpen = false;
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  });
</script>

<nav
  class="navbar sticky top-0 z-50 min-h-16 border-b border-white/40 bg-white/35 px-3 shadow-none backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 supports-[backdrop-filter]:bg-white/25 dark:border-white/10 dark:bg-slate-950/35 dark:supports-[backdrop-filter]:bg-slate-950/25 sm:px-4"
>
  <div class="navbar-start">
    {#if user || sessionUnavailable}
      <a
        href={resolve("/")}
        class="btn btn-ghost gap-2 text-base normal-case transition-transform duration-200 hover:scale-105 hover:bg-white/40 dark:hover:bg-white/10 sm:text-lg"
        aria-current={page.url.pathname === "/" ? "page" : undefined}
      >
        <Home class="size-5 sm:size-6" aria-hidden="true" />
        <span class="hidden sm:inline">Home</span>
      </a>
      <a
        href={resolve("/search")}
        class="btn btn-ghost gap-2 text-base normal-case transition-transform duration-200 hover:scale-105 hover:bg-white/40 dark:hover:bg-white/10 sm:text-lg"
        aria-current={page.url.pathname === "/search" ? "page" : undefined}
      >
        <Search class="size-5 sm:size-6" aria-hidden="true" />
        <span class="hidden sm:inline">Search</span>
      </a>
      <a
        href={resolve("/notifications")}
        class="btn btn-ghost gap-2 text-base normal-case transition-transform duration-200 hover:scale-105 hover:bg-white/40 dark:hover:bg-white/10 sm:text-lg"
        aria-current={page.url.pathname === "/notifications"
          ? "page"
          : undefined}
      >
        <span class="indicator">
          {#if unreadCount > 0}
            <span
              class="badge badge-primary indicator-item badge-xs min-w-5 px-1 text-[0.65rem]"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          {/if}
          <Bell class="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <span class="hidden sm:inline">Notifications</span>
      </a>
    {/if}
  </div>

  <div class="navbar-center">
    <span
      class="bg-linear-to-r from-primary via-fuchsia-500 to-secondary bg-clip-text text-xl font-black tracking-tight text-transparent drop-shadow-sm sm:text-2xl"
      >Cogito</span
    >
  </div>

  <div class="navbar-end gap-1">
    <button
      type="button"
      onclick={toggleTheme}
      class="btn btn-ghost btn-circle hover:bg-white/40 dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {#if theme.resolved === "light"}
        <Sun class="size-5" aria-hidden="true" />
      {:else}
        <Moon class="size-5" aria-hidden="true" />
      {/if}
    </button>

    {#if user}
      <div class="dropdown dropdown-end" bind:this={menu}>
        <button
          type="button"
          onclick={() => (menuOpen = !menuOpen)}
          class="btn btn-ghost btn-circle avatar hover:bg-white/40 dark:hover:bg-white/10"
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          <Avatar name={user.name} photoKey={user.profilePhotoKey} />
        </button>
        {#if menuOpen}
          <ul
            class="menu menu-sm dropdown-content z-[1001] mt-3 w-56 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50"
          >
            <li class="menu-title px-3 py-1 text-xs opacity-60">
              Signed in as @{user.username || "user"}
            </li>
            <li><hr class="my-1 border-base-200" /></li>
            <li>
              <a
                href={`/@${user.username}`}
                onclick={() => (menuOpen = false)}
                class="gap-2 py-2"
              >
                <UserIcon class="size-4" aria-hidden="true" />Profile
              </a>
            </li>
            <li>
              <a
                href="/settings"
                onclick={() => (menuOpen = false)}
                class="gap-2 py-2"
              >
                <Settings class="size-4" aria-hidden="true" />Settings
              </a>
            </li>
            <li><hr class="my-1 border-base-200" /></li>
            <li>
              <form method="POST" action="/logout">
                <button type="submit" class="w-full gap-2 py-2 text-error">
                  <LogOut class="size-4" aria-hidden="true" />Logout
                </button>
              </form>
            </li>
          </ul>
        {/if}
      </div>
    {:else if sessionUnavailable}
      <span class="text-xs text-base-content/60">Service unavailable</span>
    {:else}
      <a href="/login" class="btn btn-primary btn-sm rounded-full px-6"
        >Log In</a
      >
    {/if}
  </div>
</nav>
