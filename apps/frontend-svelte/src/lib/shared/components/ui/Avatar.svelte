<script lang="ts">
  import { imageUrl } from "$lib/shared/imageUrl";

  type Size = "sm" | "md" | "lg" | "xl";

  let {
    name = "",
    size = "md",
    photoKey,
  }: {
    name?: string;
    size?: Size;
    photoKey?: string;
  } = $props();

  const sizes: Record<Size, string> = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-xl",
    xl: "size-20 text-2xl",
  };
  const initial = $derived((name || "?").charAt(0).toUpperCase());
</script>

<div class:avatar={true} class:placeholder={!photoKey}>
  <div
    class={[
      "flex items-center justify-center overflow-hidden rounded-full font-bold",
      photoKey ? "bg-base-200" : "bg-primary text-primary-content",
      sizes[size],
    ]}
  >
    {#if photoKey}
      <img
        src={imageUrl(photoKey)}
        alt={name}
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      />
    {:else}
      <span>{initial}</span>
    {/if}
  </div>
</div>
