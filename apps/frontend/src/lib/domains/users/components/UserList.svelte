<script lang="ts">
  import UserItem from "./UserItem.svelte";
  import { Users } from "@lucide/svelte";
  import EmptyState from "$lib/shared/components/ui/EmptyState.svelte";
  import type { User } from "$lib/shared/types";

  let {
    users,
    currentUserId,
    emptyMessage = "No users to show.",
  } = $props<{
    users: User[] | null | undefined;
    currentUserId?: number | null;
    emptyMessage?: string;
  }>();
</script>

{#if !users || users.length === 0}
  <EmptyState icon={Users} message={emptyMessage} />
{:else}
  <ul class="space-y-3">
    {#each users as user (user.id)}
      <UserItem {user} {currentUserId} />
    {/each}
  </ul>
{/if}
