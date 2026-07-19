<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { User } from "$lib/domains/users/model";
  import { Brain, Bell, Plus, Search, User as UserIcon } from "@lucide/svelte";

  let {
    user = null,
    sessionUnavailable = false,
    unreadCount = 0,
    onCompose,
  }: {
    user?: User | null;
    sessionUnavailable?: boolean;
    unreadCount?: number;
    onCompose?: () => void;
  } = $props();

  let homeActive = $derived(page.url.pathname === "/");
  let searchActive = $derived(page.url.pathname === "/search");
  let notificationsActive = $derived(page.url.pathname === "/notifications");
  let profileActive = $derived(
    user != null &&
      (page.url.pathname === `/@${user.username}` ||
        page.url.pathname.startsWith(`/@${user.username}/`)),
  );
</script>

<nav
  class="navbar sticky top-0 z-50 min-h-16 border-b border-base-300/40 bg-base-100/35 px-3 shadow-none backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 supports-backdrop-filter:bg-base-100/25 dark:border-base-300/10 sm:px-4"
>
  <div class="navbar-start">
    <a
      href={resolve("/")}
      class="flex items-center gap-2 transition-opacity hover:opacity-80"
      aria-label="Cogito home"
      aria-current={homeActive ? "page" : undefined}
    >
      <Brain class="size-6 text-primary" aria-hidden="true" />
      <span
        class="bg-linear-to-r from-primary to-primary/70 bg-clip-text font-serif text-xl font-bold tracking-tight text-transparent sm:text-2xl"
        >Cogito</span
      >
    </a>
  </div>

  <div class="navbar-end gap-2">
    {#if user || sessionUnavailable}
      <div class="flex items-center gap-1 sm:gap-2">
        <a
          href={resolve("/search")}
          class="btn btn-circle {searchActive
            ? 'bg-primary/20! text-primary!'
            : 'btn-ghost hover:bg-base-100/60 dark:hover:bg-white/10'}"
          aria-label="Search"
          title="Search"
          aria-current={searchActive ? "page" : undefined}
        >
          <Search class="size-6" aria-hidden="true" />
        </a>
        {#if user}
          <button
            type="button"
            onclick={() => onCompose?.()}
            class="btn btn-circle bg-primary text-primary-content hover:bg-primary/90"
            aria-label="Compose post"
            title="Compose post"
          >
            <Plus class="size-6" aria-hidden="true" />
          </button>
        {/if}
        <a
          href={resolve("/notifications")}
          class="btn btn-circle {notificationsActive
            ? 'bg-primary/20! text-primary!'
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
                class="badge badge-primary indicator-item size-2 rounded-full p-0"
                aria-hidden="true"
              ></span>
            {/if}
            <Bell class="size-6" aria-hidden="true" />
          </span>
        </a>
        {#if user}
          <a
            href={resolve(`/@${user.username}`)}
            class="btn btn-circle {profileActive
              ? 'bg-primary/20! text-primary!'
              : 'btn-ghost hover:bg-base-100/60 dark:hover:bg-white/10'}"
            aria-label="Your profile"
            title={user.name || `@${user.username}`}
            aria-current={profileActive ? "page" : undefined}
          >
            <UserIcon class="size-6" aria-hidden="true" />
          </a>
        {/if}
      </div>
    {/if}
    {#if sessionUnavailable}
      <span class="text-xs muted-text">Service unavailable</span>
    {:else if !user}
      <div class="flex items-center gap-2">
        <a
          href={resolve("/login")}
          class="btn btn-ghost btn-sm rounded-full px-6">Log In</a
        >
        <a
          href={resolve("/register")}
          class="btn btn-primary btn-sm rounded-full px-6">Register</a
        >
      </div>
    {/if}
  </div>
</nav>
