<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import type { Snippet } from "svelte";

  let {
    children,
    interactive = false,
    class: className = "",
    ...attributes
  }: HTMLAttributes<HTMLDivElement> & {
    children: Snippet;
    interactive?: boolean;
  } = $props();
</script>

<div
  class={[interactive ? "glass-card-interactive" : "glass-card", className]}
  {...attributes}
>
  {@render children()}
</div>
