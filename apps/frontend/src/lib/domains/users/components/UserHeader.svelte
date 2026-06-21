<!-- eslint-disable svelte/no-navigation-without-resolve -->
<script lang="ts">
  /* eslint-disable svelte/prefer-writable-derived */
  import { enhance } from "$app/forms";
  import { imageUrl } from "$lib/shared/imageUrl";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import { Pen, Check, UserPlus, Calendar } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { resolve } from "$app/paths";
  import type { User } from "$lib/shared/types";

  let { user, currentUser } = $props<{
    user: User;
    currentUser?: User | null;
  }>();

  let optimisticFollowOverride = $state<boolean | null>(null);
  let followed = $derived(optimisticFollowOverride !== null ? optimisticFollowOverride : (user.followed ?? false));

  function formatDate(dateString: string | undefined) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  let isOwnProfile = $derived(currentUser && currentUser.id === user.id);
</script>

<GlassCard class="overflow-hidden">
  <div
    class="relative h-24 bg-gradient-to-tr from-primary via-primary/80 to-secondary sm:h-32"
  >
    {#if user.coverPhotoKey}
      <img
        src={imageUrl(user.coverPhotoKey)}
        alt="Cover"
        class="absolute inset-0 h-full w-full object-cover"
      />
    {:else}
      <div
        class="absolute inset-0 opacity-10"
        style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px); background-size: 24px 24px;"
      ></div>
    {/if}
  </div>
  <div class="card-body relative -mt-11 px-4 pb-4 sm:-mt-14 sm:px-6 sm:pb-6">
    <div class="flex items-end justify-between">
      <div
        class="relative rounded-full border border-base-200/50 bg-base-100 p-1 dark:bg-slate-800"
      >
        <Avatar name={user.name} size="lg" photoKey={user.profilePhotoKey} />
      </div>
      {#if isOwnProfile}
        <a
          href={resolve("/settings/profile")}
          class="btn btn-outline btn-sm gap-1 rounded-full px-3 sm:px-4"
        >
          <Pen class="h-4 w-4" />
          <span class="hidden xs:inline">Edit Profile</span>
          <span class="xs:hidden">Edit</span>
        </a>
      {:else}
        <form
          method="POST"
          action="?/toggleFollow"
          use:enhance={() => {
            const wasFollowed = followed;
            optimisticFollowOverride = !wasFollowed;

            return async ({ result, update }) => {
              optimisticFollowOverride = null;
              if (result.type !== "failure") {
                await update({ invalidateAll: false });
              }
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
            class={`btn btn-sm gap-1 rounded-full px-3 sm:px-4 ${followed ? "btn-outline" : "btn-primary"}`}
          >
            {#if followed}
              <Check class="h-4 w-4" />
              Following
            {:else}
              <UserPlus class="h-4 w-4" />
              Follow
            {/if}
          </button>
        </form>
      {/if}
    </div>
    <div class="mt-3 sm:mt-4">
      <h1 class="text-xl font-bold">{user.name}</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
      {#if user.bio}
        <p
          class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200"
        >
          {user.bio}
        </p>
      {/if}
      <div
        class="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
      >
        <Calendar class="h-4 w-4" />
        <span>Joined {formatDate(user.created)}</span>
      </div>
    </div>
  </div>
</GlassCard>
