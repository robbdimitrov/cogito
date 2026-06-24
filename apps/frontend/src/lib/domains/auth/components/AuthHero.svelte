<script lang="ts">
  import { Check, MessageSquare } from "@lucide/svelte";

  let {
    eyebrow,
    title,
    description,
    points,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    points: string[];
  } = $props();
</script>

<div
  class="relative hidden items-center justify-center overflow-hidden bg-linear-to-br from-primary to-secondary p-12 lg:flex lg:w-1/2"
>
  <div
    class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_80%,white_1px,transparent_1px),radial-gradient(circle_at_80%_20%,white_1px,transparent_1px)] bg-size-[32px_32px]"
    aria-hidden="true"
  ></div>
  <div class="relative text-center text-primary-content">
    <MessageSquare class="mx-auto mb-8 size-24 opacity-80" aria-hidden="true" />
    <p
      class="mb-3 text-sm font-semibold tracking-[0.24em] uppercase opacity-75"
    >
      {eyebrow}
    </p>
    <h1 class="mb-4 text-4xl font-extrabold">{title}</h1>
    <p class="mb-8 text-xl opacity-90">{description}</p>
    <div class="mx-auto max-w-xs space-y-4 text-left">
      {#each points as point (point)}
        <div class="flex items-center gap-3">
          <div
            class="flex size-8 items-center justify-center rounded-full bg-white/20"
          >
            <Check class="size-4" aria-hidden="true" />
          </div>
          <span>{point}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
