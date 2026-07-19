<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Check, UserPlus } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/shared/types";
  import { getToastContext } from "$lib/shared/toast.svelte";

  let { user, currentUserId } = $props<{
    user: User;
    currentUserId?: number | null;
  }>();

  const toast = getToastContext();

  let isCurrentUser = $derived(currentUserId && user.id === currentUserId);

  let optimisticFollowOverride = $state<boolean | null>(null);
  let followed = $derived(
    optimisticFollowOverride !== null
      ? optimisticFollowOverride
      : (user.followed ?? false),
  );
  let isActionLoading = $state(false);
</script>

<GlassCard as="li" interactive>
  <div class="card-body p-4 sm:p-5">
    <div class="flex items-start justify-between gap-3">
      <a
        href={resolve(`/@${user.username}`)}
        class="group flex min-w-0 items-center gap-3"
      >
        <div
          class="shrink-0 rounded-full bg-base-100/55 p-1 ring-1 ring-base-300/80 dark:bg-white/5 dark:ring-white/10"
        >
          <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
        </div>
        <div class="min-w-0 pt-0.5">
          <p
            class="truncate font-semibold text-base-content group-hover:underline"
          >
            {user.name}
          </p>
          <p class="muted-text text-sm">
            @{user.username}
          </p>
        </div>
      </a>
      {#if !isCurrentUser}
        <form
          method="POST"
          action="?/toggleFollow"
          use:enhance={() => {
            const wasFollowed = followed;
            optimisticFollowOverride = !wasFollowed;
            isActionLoading = true;

            return async ({ result, update }) => {
              isActionLoading = false;
              if (result.type === "failure") {
                optimisticFollowOverride = wasFollowed;
                toast.error("Action failed");
                return;
              }
              await update({ invalidateAll: false });
            };
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <input
            type="hidden"
            name="action"
            value={followed ? "unfollow" : "follow"}
          />
          <button
            class={`btn btn-sm shrink-0 gap-1 rounded-full px-4 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
              followed
                ? "btn-outline border-base-300/80 bg-base-100/30 dark:border-white/10 dark:bg-white/5"
                : "btn-primary shadow-primary/20"
            }`}
            disabled={isActionLoading}
          >
            {#if isActionLoading}
              <span class="loading loading-spinner loading-xs"></span>
            {:else if followed}
              <Check class="size-4" />
              Following
            {:else}
              <UserPlus class="size-4" />
              Follow
            {/if}
          </button>
        </form>
      {/if}
      {#if isCurrentUser}
        <span
          class="muted-text rounded-full border border-base-300/80 bg-base-100/40 px-3 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-white/5"
        >
          You
        </span>
      {/if}
    </div>
    {#if user.bio}
      <p
        class="line-clamp-2 mt-3 text-sm leading-relaxed text-base-content/75 sm:pl-14"
      >
        {user.bio}
      </p>
    {/if}
  </div>
</GlassCard>
