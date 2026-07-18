<script lang="ts">
  import Navbar from "$lib/shared/components/layout/Navbar.svelte";
  import AmbientBackground from "$lib/shared/components/layout/AmbientBackground.svelte";
  import ToastProvider from "$lib/shared/components/ui/ToastProvider.svelte";

  let { children } = $props();
</script>

<ToastProvider>
  <AmbientBackground />
  <Navbar />
  {@render children()}
</ToastProvider>
