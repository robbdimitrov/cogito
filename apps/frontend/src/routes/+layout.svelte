<script lang="ts">
  import "../app.css";
  import { setThemeContext } from "$lib/shared/theme.svelte";
  import { onMount } from "svelte";
  import { navigating } from "$app/state";

  let { data, children } = $props();

  const theme = setThemeContext(() => data.theme);
  onMount(theme.start);
</script>

{@render children()}

{#if navigating.to}
  <div class="fixed left-0 top-0 z-100 h-1 w-full bg-primary/20">
    <div
      class="size-full origin-left animate-[progress_1.5s_ease-in-out_infinite] bg-primary"
    ></div>
  </div>
{/if}

<style>
  @keyframes progress {
    0% {
      transform: scaleX(0);
      transform-origin: left;
    }
    50% {
      transform: scaleX(1);
      transform-origin: left;
    }
    50.1% {
      transform: scaleX(1);
      transform-origin: right;
    }
    100% {
      transform: scaleX(0);
      transform-origin: right;
    }
  }
</style>
