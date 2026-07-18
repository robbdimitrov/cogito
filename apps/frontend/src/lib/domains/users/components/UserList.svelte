<script lang="ts">
  import UserItem from "./UserItem.svelte";
  import { Users } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
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
  <GlassCard>
    <div class="card-body muted-text items-center py-12 text-center">
      <Users class="mb-2 size-12 text-base-content opacity-50" />
      <p>{emptyMessage}</p>
    </div>
  </GlassCard>
{:else}
  <ul class="space-y-3">
    {#each users as user (user.id)}
      <UserItem {user} {currentUserId} />
    {/each}
  </ul>
{/if}
