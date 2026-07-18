<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LucideIcon } from "@lucide/svelte";
  import GlassCard from "./GlassCard.svelte";

  interface Props {
    icon: LucideIcon;
    message: string;
    children?: Snippet;
  }

  let { icon: Icon, message, children }: Props = $props();
</script>

<GlassCard>
  <div class="card-body muted-text items-center py-12 text-center">
    <Icon class="mb-2 size-12 text-base-content opacity-50" aria-hidden="true" />
    <p>{message}</p>
    {#if children}
      {@render children()}
    {/if}
  </div>
</GlassCard>
