<script lang="ts">
  import Navbar from "$lib/shared/components/layout/Navbar.svelte";
  import ToastProvider from "$lib/shared/components/ui/ToastProvider.svelte";

  let { children } = $props();
</script>

<ToastProvider>
  <Navbar />
  {@render children()}
</ToastProvider>
