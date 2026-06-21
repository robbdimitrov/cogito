<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    label,
    children,
  }: {
    id: string;
    label: string;
    children: Snippet;
  } = $props();
</script>

<div class="form-control">
  <label class="label" for={id}>
    <span class="label-text text-sm font-medium">{label}</span>
  </label>
  {@render children()}
</div>
