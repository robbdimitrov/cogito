<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { pageTitle } from "$lib/shared/pageTitle";
</script>

<svelte:head>
  <title>{pageTitle(String(page.status))}</title>
</svelte:head>

<main class="grid min-h-screen place-items-center px-4">
  <div class="glass-card max-w-md p-8 text-center">
    <p class="text-sm font-semibold text-primary">{page.status}</p>
    <h1 class="mt-2 text-2xl font-bold">Something went wrong</h1>
    <p class="mt-3 text-base-content/70">
      {page.error?.message ?? "The page could not be loaded."}
    </p>
    <a href={resolve("/")} class="btn btn-primary mt-6 rounded-full px-6"
      >Return home</a
    >
  </div>
</main>
