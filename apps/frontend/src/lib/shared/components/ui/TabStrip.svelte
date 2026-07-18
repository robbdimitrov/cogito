<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Pathname } from "$app/types";

  type Tab = {
    name: string;
    href: string;
    isActive: boolean;
    count?: number;
  };

  let { tabs }: { tabs: Tab[] } = $props();
</script>

<div
  class={`glass-surface tabs tabs-boxed mt-3 grid rounded-2xl p-1 sm:mt-4 sm:p-1.5 ${
    tabs.length === 4 ? "grid-cols-4" : "grid-cols-3"
  }`}
>
  {#each tabs as tab (tab.name)}
    <a
      href={resolve(tab.href as Pathname)}
      data-sveltekit-preload-data="hover"
      class={`tab group h-10 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium transition-all duration-300 sm:gap-1.5 sm:px-4 sm:text-sm ${
        tab.isActive
          ? "tab-active bg-primary! text-primary-content! shadow-sm"
          : "text-base-content/70! hover:bg-base-200/70 hover:text-base-content! dark:hover:bg-white/5 dark:hover:text-white!"
      }`}
    >
      {tab.name}
      {#if tab.count !== undefined}
        <span
          class={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all duration-300 sm:ml-1.5 sm:px-2.5 ${
            tab.isActive
              ? "bg-primary-content/25 text-primary-content"
              : "text-primary group-hover:bg-primary/20 dark:group-hover:bg-primary/30 bg-primary/10 dark:bg-primary/20"
          }`}
        >
          {tab.count}
        </span>
      {/if}
    </a>
  {/each}
</div>
