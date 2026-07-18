<script lang="ts">
  import { resolve } from "$app/paths";
  import type { LucideIcon } from "@lucide/svelte";

  interface Props {
    icon: LucideIcon;
    iconClass?: string;
    ariaLabel: string;
    buttonClass: string;
    count?: number;
    countClass?: string;
    label?: string;
  }

  let {
    icon: Icon,
    iconClass = "size-4",
    ariaLabel,
    buttonClass,
    count,
    countClass,
    label,
  }: Props = $props();
</script>

<a href={resolve("/login")} class={buttonClass} aria-label={ariaLabel}>
  <Icon class={iconClass} />
  {#if label}
    {label}
  {:else if countClass}
    <span class={countClass}>{count}</span>
  {:else}
    {count}
  {/if}
</a>
