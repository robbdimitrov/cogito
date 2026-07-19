<script lang="ts">
  import { enhance } from "$app/forms";
  import { imageUrl } from "$lib/shared/imageUrl";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Check, UserPlus, Calendar, Settings } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import LoginGateButton from "$lib/shared/components/ui/LoginGateButton.svelte";
  import { resolve } from "$app/paths";
  import type { User } from "$lib/shared/types";

  let { user, currentUser } = $props<{
    user: User;
    currentUser?: User | null;
  }>();

  let optimisticFollowOverride = $state<boolean | null>(null);
  let followed = $derived(
    optimisticFollowOverride !== null
      ? optimisticFollowOverride
      : (user.followed ?? false),
  );
  let isFollowing = $state(false);

  function formatDate(dateString: string | undefined) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  let isOwnProfile = $derived(currentUser && currentUser.id === user.id);
</script>

<GlassCard class="overflow-hidden">
  <div class="relative">
    <div
      class="relative h-24 bg-linear-to-tr from-primary via-primary/80 to-secondary sm:h-32"
    >
      {#if user.coverPhotoKey}
        <img
          src={imageUrl(user.coverPhotoKey)}
          alt="Cover"
          width="768"
          height="128"
          class="absolute inset-0 size-full object-cover"
        />
      {:else}
        <div
          class="absolute inset-0 opacity-10"
          style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px); background-size: 24px 24px;"
        ></div>
      {/if}
    </div>

    <!-- avatar centered on the cover/body seam (top-24/32 = cover height) for an exact 50% overlap -->
    <div
      class="absolute left-5 top-24 -translate-y-1/2 rounded-full border border-base-300/80 bg-base-100 p-1 dark:border-base-300/30 dark:bg-base-200 sm:left-8 sm:top-32"
    >
      <Avatar name={user.name} size="xl" photoKey={user.profilePhotoKey} />
    </div>

    <div class="card-body p-5 sm:p-8">
      <div class="space-y-3">
        <div class="flex justify-end">
          {#if isOwnProfile}
            <a
              href={resolve("/settings")}
              class="btn btn-outline btn-sm gap-1 rounded-full px-3 sm:px-4"
            >
              <Settings class="size-4" />
              Settings
            </a>
          {:else if currentUser}
            <form
              method="POST"
              action="?/toggleFollow"
              use:enhance={() => {
                if (isFollowing) return () => {};
                isFollowing = true;
                const wasFollowed = followed;
                optimisticFollowOverride = !wasFollowed;

                return async ({ result, update }) => {
                  isFollowing = false;

                  if (result.type === "failure") {
                    optimisticFollowOverride = wasFollowed;
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
                class={`btn btn-sm gap-1 rounded-full px-3 sm:px-4 disabled:opacity-70 ${
                  followed
                    ? "btn-outline disabled:bg-transparent! disabled:text-base-content!"
                    : "btn-primary disabled:bg-primary! disabled:text-primary-content!"
                }`}
                disabled={isFollowing}
              >
                {#if followed}
                  <Check class="size-4" />
                  Following
                {:else}
                  <UserPlus class="size-4" />
                  Follow
                {/if}
              </button>
            </form>
          {:else}
            <LoginGateButton
              icon={UserPlus}
              ariaLabel="Log in to follow"
              buttonClass="btn btn-primary btn-sm gap-1 rounded-full px-3 sm:px-4"
              label="Follow"
            />
          {/if}
        </div>
        <div>
          <h1 class="truncate text-xl font-bold">{user.name}</h1>
          <p class="muted-text truncate text-sm">@{user.username}</p>
          {#if user.bio}
            <p
              class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-base-content/80"
            >
              {user.bio}
            </p>
          {/if}
          <div class="mt-3 flex items-center gap-2 text-xs opacity-60">
            <Calendar class="size-4" />
            <span>Joined {formatDate(user.created)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</GlassCard>
