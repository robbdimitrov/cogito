<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { User } from "$lib/domains/users/model";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import {
    Home,
    LogOut,
    Bell,
    ChevronDown,
    Search,
    Settings,
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

  let menuOpen = $state(false);
  let menu = $state<HTMLDivElement>();

  let homeActive = $derived(page.url.pathname === "/");
  let searchActive = $derived(page.url.pathname === "/search");
  let notificationsActive = $derived(page.url.pathname === "/notifications");

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
  class="navbar sticky top-0 z-50 min-h-16 border-b border-base-300/40 bg-base-100/35 px-3 shadow-none backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 supports-backdrop-filter:bg-base-100/25 dark:border-base-300/10 sm:px-4"
>
  <div class="navbar-start">
    {#if user || sessionUnavailable}
      <div
        class="flex items-center gap-1 rounded-full bg-base-100/40 p-1 dark:bg-base-100/10"
      >
        <a
          href={resolve("/")}
          class="btn btn-circle {homeActive
            ? 'bg-primary! text-primary-content!'
            : 'btn-ghost hover:bg-base-100/60 dark:hover:bg-white/10'}"
          aria-label="Home"
          title="Home"
          aria-current={homeActive ? "page" : undefined}
        >
          <Home class="size-6" aria-hidden="true" />
        </a>
        <a
          href={resolve("/search")}
          class="btn btn-circle {searchActive
            ? 'bg-primary! text-primary-content!'
            : 'btn-ghost hover:bg-base-100/60 dark:hover:bg-white/10'}"
          aria-label="Search"
          title="Search"
          aria-current={searchActive ? "page" : undefined}
        >
          <Search class="size-6" aria-hidden="true" />
        </a>
      </div>
    {/if}
  </div>

  <div class="navbar-center">
    <span
      class="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-serif text-xl font-bold tracking-tight text-transparent sm:text-2xl"
      >Cogito</span
    >
  </div>

  <div class="navbar-end gap-2">
    {#if user || sessionUnavailable}
      <div
        class="flex items-center rounded-full bg-base-100/40 p-1 dark:bg-base-100/10"
      >
        <a
          href={resolve("/notifications")}
          class="btn btn-circle {notificationsActive
            ? 'bg-primary! text-primary-content!'
            : 'btn-ghost hover:bg-base-100/60 dark:hover:bg-white/10'}"
          aria-label={unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"}
          title="Notifications"
          aria-current={notificationsActive ? "page" : undefined}
        >
          <span class="indicator">
            {#if unreadCount > 0}
              <span
                class="badge badge-primary indicator-item badge-xs min-w-5 px-1 text-[0.65rem]"
                aria-hidden="true"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            {/if}
            <Bell class="size-6" aria-hidden="true" />
          </span>
        </a>
      </div>
    {/if}
    {#if user}
      <div class="dropdown dropdown-end" bind:this={menu}>
        <button
          type="button"
          onclick={() => (menuOpen = !menuOpen)}
          class="btn btn-ghost gap-1 px-2 hover:bg-base-100/40 dark:hover:bg-base-100/10"
          aria-label="User menu"
          title={user.name || `@${user.username}`}
          aria-expanded={menuOpen}
        >
          <Avatar name={user.name} photoKey={user.profilePhotoKey} size="sm" />
          <ChevronDown class="size-4 opacity-60" aria-hidden="true" />
        </button>
        {#if menuOpen}
          <ul
            class="menu menu-sm dropdown-content dropdown-surface z-1001 mt-3 w-56 p-2"
          >
            <li class="menu-title px-3 py-1 text-xs opacity-60">
              Signed in as @{user.username || "user"}
            </li>
            <li><hr class="my-1 border-base-200" /></li>
            <li>
              <a
                href={resolve(`/@${user.username}`)}
                onclick={() => (menuOpen = false)}
                class="gap-2 py-2"
              >
                <UserIcon class="size-4" aria-hidden="true" />Profile
              </a>
            </li>
            <li>
              <a
                href={resolve("/settings")}
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
      <span class="text-xs muted-text">Service unavailable</span>
    {:else}
      <a
        href={resolve("/login")}
        class="btn btn-primary btn-sm rounded-full px-6">Log In</a
      >
    {/if}
  </div>
</nav>
