<script lang="ts">
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/domains/users/model";
  import { imageUrl } from "$lib/shared/imageUrl";

  let { user, variant = "sidebar" } = $props<{
    user: User;
    variant?: "compact" | "sidebar";
  }>();
</script>

{#snippet stats(compact: boolean)}
  <div
    class="flex {compact
      ? 'gap-4'
      : 'mt-4 justify-around border-t border-slate-200 pt-4 dark:border-slate-700'}"
  >
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.posts ?? 0}
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Thoughts</p>
    </div>
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.following ?? 0}
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Following</p>
    </div>
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.followers ?? 0}
      </p>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Followers</p>
    </div>
  </div>
{/snippet}

{#if variant === "compact"}
  <GlassCard class="overflow-hidden">
    <div class="flex items-center gap-3 p-3">
      <a href="/@{user.username}" class="shrink-0">
        <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
      </a>
      <a href="/@{user.username}" class="min-w-0 flex-1">
        <p
          class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          Your profile
        </p>
        <p class="truncate font-bold leading-tight">{user.name}</p>
        <p class="truncate text-sm text-slate-500 dark:text-slate-400">
          @{user.username}
        </p>
      </a>
      <a
        href="/@{user.username}"
        class="btn btn-primary btn-xs rounded-full px-3"
      >
        View
      </a>
    </div>
    <div class="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
      {@render stats(true)}
    </div>
  </GlassCard>
{:else}
  <GlassCard class="sticky top-20 overflow-hidden">
    <div class="relative h-16 bg-gradient-to-r from-primary/70 to-secondary/70">
      {#if user.coverPhotoKey}
        <img
          src={imageUrl(user.coverPhotoKey)}
          alt="Cover"
          class="absolute inset-0 h-full w-full object-cover"
        />
      {/if}
    </div>
    <div class="card-body relative z-10 -mt-8 p-4">
      <a href="/@{user.username}">
        <div class="flex items-center gap-3">
          <div
            class="rounded-full border border-base-200/50 bg-base-100 p-1 dark:bg-slate-800"
          >
            <Avatar
              name={user.name}
              size="lg"
              photoKey={user.profilePhotoKey}
            />
          </div>
          <div class="min-w-0 pt-6">
            <p class="truncate font-bold">{user.name}</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              @{user.username}
            </p>
          </div>
        </div>
      </a>
      {@render stats(false)}
    </div>
  </GlassCard>
{/if}
