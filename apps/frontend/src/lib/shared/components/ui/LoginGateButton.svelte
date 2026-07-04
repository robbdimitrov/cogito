<script lang="ts">
  import { resolve } from "$app/paths";
  import type { LucideIcon } from "@lucide/svelte";

  interface Props {
    icon: LucideIcon;
    iconClass?: string;
    ariaLabel: string;
    buttonClass: string;
    count: number;
    countClass?: string;
  }

  let {
    icon: Icon,
    iconClass = "h-4 w-4",
    ariaLabel,
    buttonClass,
    count,
    countClass,
  }: Props = $props();
</script>

<a href={resolve("/login")} class={buttonClass} aria-label={ariaLabel}>
  <Icon class={iconClass} />
  {#if countClass}
    <span class={countClass}>{count}</span>
  {:else}
    {count}
  {/if}
</a>
