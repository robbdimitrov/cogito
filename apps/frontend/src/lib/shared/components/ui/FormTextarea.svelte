<script lang="ts">
  import type { HTMLTextareaAttributes } from "svelte/elements";

  let {
    value = $bindable(),
    class: className = "",
    ...attributes
  }: HTMLTextareaAttributes = $props();
</script>

<textarea bind:value class={["form-textarea", className]} {...attributes}
></textarea>
