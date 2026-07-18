<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";

  let {
    children,
    interactive = false,
    as = "div",
    class: className = "",
    ...attributes
  }: HTMLAttributes<HTMLElement> &
    Partial<HTMLAnchorAttributes> & {
      children: Snippet;
      interactive?: boolean;
      as?: string;
    } = $props();
</script>

<svelte:element
  this={as}
  class={[interactive ? "glass-card-interactive" : "glass-card", className]}
  {...attributes}
>
  {@render children()}
</svelte:element>
