<script lang="ts">
  import Navbar from "$lib/shared/components/layout/Navbar.svelte";
  import ToastProvider from "$lib/shared/components/ui/ToastProvider.svelte";
  import ComposeModal from "$lib/domains/posts/components/ComposeModal.svelte";

  let { data, children } = $props();

  let composeOpen = $state(false);
</script>

<ToastProvider>
  <div
    class="fixed inset-0 -z-10 overflow-hidden bg-linear-to-br from-base-200 via-base-100 to-base-200 transition-colors duration-300"
    aria-hidden="true"
  >
    <div
      class="animate-pulse-slow absolute -top-32 -right-32 size-160 rounded-full bg-primary/20 opacity-70 mix-blend-multiply blur-[100px] dark:bg-primary/10 dark:mix-blend-lighten"
    ></div>
    <div
      class="animate-pulse-slow absolute -bottom-40 -left-32 size-180 rounded-full bg-secondary/20 opacity-70 mix-blend-multiply blur-[120px] [animation-delay:1s] dark:bg-secondary/10 dark:mix-blend-lighten"
    ></div>
  </div>

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
