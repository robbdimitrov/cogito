<script lang="ts">
  import FormInput from "./FormInput.svelte";
  import type { LucideIcon } from "@lucide/svelte";
  import type { HTMLInputAttributes } from "svelte/elements";

  let {
    icon: Icon,
    iconClass = "",
    value = $bindable(),
    class: className = "",
    ...attributes
  }: HTMLInputAttributes & {
    icon: LucideIcon;
    iconClass?: string;
  } = $props();
</script>

<div class="relative">
  <Icon
    class={[
      "pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-base-content/40",
      iconClass,
    ].join(" ")}
    aria-hidden="true"
  />
  <FormInput
    bind:value
    class={["pl-10", className].join(" ")}
    {...attributes}
  />
</div>
