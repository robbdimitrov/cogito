<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { User } from "$lib/shared/types";

  let { user } = $props<{ user: User }>();

  let path = $derived(`/@${user.username}`);

  let tabs = $derived([
    {
      name: "Posts",
      count: user.posts,
      href: path,
      isActive:
        page.url.pathname === path &&
        !page.url.pathname.match(/\/(following|followers|likes)$/),
    },
    {
      name: "Following",
      count: user.following,
      href: `${path}/following`,
      isActive: page.url.pathname.endsWith("/following"),
    },
    {
      name: "Followers",
      count: user.followers,
      href: `${path}/followers`,
      isActive: page.url.pathname.endsWith("/followers"),
    },
    {
      name: "Likes",
      count: user.likes,
      href: `${path}/likes`,
      isActive: page.url.pathname.endsWith("/likes"),
    },
  ]);
</script>

<div
  class="glass-surface tabs tabs-boxed mt-3 grid grid-cols-4 rounded-2xl p-1 sm:mt-4 sm:p-1.5"
>
  {#each tabs as tab (tab.name)}
    <a
      href={resolve(tab.href as string)}
      data-sveltekit-preload-data="hover"
      class={`tab group h-10 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium transition-all duration-300 sm:gap-1.5 sm:px-4 sm:text-sm ${
        tab.isActive
          ? "tab-active bg-primary! text-primary-content! shadow-sm"
          : "hover:bg-black/5 hover:text-slate-950! dark:hover:bg-white/5 dark:hover:text-white! text-slate-600! dark:text-slate-300!"
      }`}
    >
      {tab.name}
      <span
        class={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all duration-300 sm:ml-1.5 sm:px-2.5 ${
          tab.isActive
            ? "bg-primary-content/25 text-primary-content"
            : "text-primary group-hover:bg-primary/20 dark:group-hover:bg-primary/30 bg-primary/10 dark:bg-primary/20 dark:text-violet-300"
        }`}
      >
        {tab.count}
      </span>
    </a>
  {/each}
</div>
