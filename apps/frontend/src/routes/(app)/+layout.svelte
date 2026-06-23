<script lang="ts">
  import Navbar from "$lib/shared/components/layout/Navbar.svelte";
  import ToastProvider from "$lib/shared/components/ui/ToastProvider.svelte";

  let { data, children } = $props();
</script>

<ToastProvider>
  <div
    class="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-50 transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    aria-hidden="true"
  >
    <div
      class="animate-pulse-slow absolute -top-32 -right-32 h-[40rem] w-[40rem] rounded-full bg-fuchsia-400/20 opacity-70 mix-blend-multiply blur-[100px] dark:bg-fuchsia-600/10 dark:mix-blend-lighten"
    ></div>
    <div
      class="animate-pulse-slow absolute -bottom-40 -left-32 h-[45rem] w-[45rem] rounded-full bg-sky-400/20 opacity-70 mix-blend-multiply blur-[120px] [animation-delay:1s] dark:bg-sky-600/10 dark:mix-blend-lighten"
    ></div>
    <div
      class="absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 opacity-50 mix-blend-multiply blur-[100px] dark:bg-indigo-600/10 dark:mix-blend-lighten"
    ></div>
  </div>

  <Navbar
    user={data.currentUser}
    sessionUnavailable={data.sessionUnavailable}
    unreadCount={data.unreadCount}
  />
  <div class="relative z-0 flex min-h-[calc(100vh-4rem)] flex-col">
    {@render children()}
  </div>
</ToastProvider>
