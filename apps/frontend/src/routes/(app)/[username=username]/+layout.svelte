<script lang="ts">
  import UserHeader from "$lib/domains/users/components/UserHeader.svelte";
  import ControlBar from "$lib/domains/users/components/ControlBar.svelte";

  let { data, children } = $props();
  let user = $derived(data.profileUser);
  let currentUser = $derived(data.currentUser);
</script>

<svelte:head>
  <title>{user.name} (@{user.username}) - Cogito</title>
  <meta property="og:title" content="{user.name} (@{user.username})" />
  <meta
    property="og:description"
    content={user.bio || `View ${user.name}'s profile on Cogito`}
  />
</svelte:head>

<main class="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
  <UserHeader {user} {currentUser} />
  <ControlBar {user} />
  <div class="mt-3 sm:mt-4">
    {@render children()}
  </div>
</main>
