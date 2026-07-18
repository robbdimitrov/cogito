<script lang="ts">
  import Navbar from "$lib/shared/components/layout/Navbar.svelte";
  import AmbientBackground from "$lib/shared/components/layout/AmbientBackground.svelte";
  import ToastProvider from "$lib/shared/components/ui/ToastProvider.svelte";
  import ComposeModal from "$lib/domains/posts/components/ComposeModal.svelte";
  import { setComposeContext } from "$lib/domains/posts/compose.svelte";

  let { data, children } = $props();

  let composeOpen = $state(false);

  setComposeContext({ open: () => (composeOpen = true) });
</script>

<ToastProvider>
  <AmbientBackground />

  <Navbar
    user={data.currentUser}
    sessionUnavailable={data.sessionUnavailable}
    unreadCount={data.unreadCount}
    onCompose={() => (composeOpen = true)}
  />
  <div class="relative z-0 flex min-h-[calc(100vh-4rem)] flex-col">
    {@render children()}
  </div>

  {#if composeOpen && data.currentUser}
    <ComposeModal
      user={data.currentUser}
      onClose={() => (composeOpen = false)}
    />
  {/if}
</ToastProvider>
