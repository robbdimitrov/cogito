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
  <div class="w-full max-w-md lg:max-w-4xl">
    <div class="glass-card overflow-hidden lg:grid lg:grid-cols-2">
      <div
        data-theme="dark"
        class="relative hidden flex-col justify-between overflow-hidden bg-base-100 p-10 lg:flex"
      >
        <div
          class="absolute inset-0 opacity-10"
          style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px); background-size: 24px 24px;"
        ></div>
        <div
          class="absolute -top-16 -right-16 size-72 rounded-full bg-primary/30 blur-3xl"
        ></div>
        <span
          class="relative font-serif text-3xl font-semibold tracking-tight text-base-content"
          >Cogito</span
        >
        <p
          class="relative font-serif text-xl leading-relaxed text-base-content/80"
        >
          Where thinking finds its ink.
        </p>
      </div>
      <div class="card-body">
        <div class="mb-4 text-center lg:hidden">
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
