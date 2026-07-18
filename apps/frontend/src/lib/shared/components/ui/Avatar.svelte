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
  // Pixel equivalents of the Tailwind size-* classes above, for the img
  // width/height attributes (1 unit = 4px).
  const pixelSizes: Record<Size, number> = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
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
        src={imageUrl(photoKey, "thumb")}
        alt={name}
        width={pixelSizes[size]}
        height={pixelSizes[size]}
        loading="lazy"
        decoding="async"
        class="size-full object-cover"
      />
    {:else}
      <span>{initial}</span>
    {/if}
  </div>
</div>
