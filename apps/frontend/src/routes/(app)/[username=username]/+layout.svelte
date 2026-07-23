<script lang="ts">
  import UserHeader from "$lib/domains/users/components/UserHeader.svelte";
  import ControlBar from "$lib/domains/users/components/ControlBar.svelte";
  import { pageTitle } from "$lib/shared/pageTitle";

  let { data, children } = $props();
  let user = $derived(data.profileUser);
  let currentUser = $derived(data.currentUser);
</script>

<svelte:head>
  <title>{pageTitle(`${user.name} (@${user.username})`)}</title>
  <meta property="og:title" content="{user.name} (@{user.username})" />
  <meta
    property="og:description"
    content={user.bio || `View ${user.name}'s profile on Cogito`}
  />
</svelte:head>

<main class="profile-shell">
  <UserHeader {user} {currentUser} />
  <ControlBar {user} />
  <div class="mt-3 sm:mt-4">
    {@render children()}
  </div>
</main>
