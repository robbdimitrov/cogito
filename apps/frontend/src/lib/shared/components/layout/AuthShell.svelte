<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    eyebrow,
    heading,
    description,
    children,
  }: {
    eyebrow: string;
    heading: string;
    description: string;
    children: Snippet;
  } = $props();
</script>

<div
  class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12"
>
  <div class="w-full max-w-md">
    <div class="glass-card overflow-hidden">
      <div class="card-body">
        <div class="mb-4 text-center">
          <span class="font-serif text-2xl font-semibold text-primary"
            >Cogito</span
          >
        </div>
        <span
          class="text-xs font-semibold uppercase tracking-wider text-base-content/50"
          >{eyebrow}</span
        >
        <h1 class="card-title mt-1 mb-1 text-2xl">{heading}</h1>
        <p class="mb-6 text-base-content/60">{description}</p>
        {@render children()}
      </div>
    </div>
  </div>
</div>
