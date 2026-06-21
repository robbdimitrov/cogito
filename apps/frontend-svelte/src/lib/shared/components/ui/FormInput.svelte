<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  let {
    value = $bindable(),
    class: className = "",
    ...attributes
  }: HTMLInputAttributes = $props();
</script>

<input bind:value class={["form-input", className]} {...attributes} />
