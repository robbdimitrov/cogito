<script lang="ts">
  import { resolve } from "$app/paths";
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
      : 'subtle-border mt-4 justify-around border-t pt-4'}"
  >
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.posts ?? 0}
      </p>
      <p class="muted-text mt-1 text-xs">Cogito</p>
    </div>
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.following ?? 0}
      </p>
      <p class="muted-text mt-1 text-xs">Following</p>
    </div>
    <div class={compact ? "" : "text-center"}>
      <p
        class="font-bold {compact
          ? 'text-sm leading-none'
          : 'text-lg leading-none'}"
      >
        {user.followers ?? 0}
      </p>
      <p class="muted-text mt-1 text-xs">Followers</p>
    </div>
  </div>
{/snippet}

{#if variant === "compact"}
  <GlassCard class="overflow-hidden">
    <div class="flex items-center gap-3 p-3">
      <a href={resolve(`/@${user.username}`)} class="shrink-0">
        <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
      </a>
      <a href={resolve(`/@${user.username}`)} class="min-w-0 flex-1">
        <p class="muted-text text-xs font-semibold uppercase tracking-wide">
          Your profile
        </p>
        <p class="truncate font-bold leading-tight">{user.name}</p>
        <p class="muted-text truncate text-sm">
          @{user.username}
        </p>
      </a>
      <a
        href={resolve(`/@${user.username}`)}
        class="btn btn-primary btn-xs rounded-full px-3"
      >
        View
      </a>
    </div>
    <div class="subtle-border border-t px-3 py-2">
      {@render stats(true)}
    </div>
  </GlassCard>
{:else}
  <GlassCard class="sticky top-20 overflow-hidden">
    <div class="relative h-16 bg-linear-to-r from-primary/70 to-secondary/70">
      {#if user.coverPhotoKey}
        <img
          src={imageUrl(user.coverPhotoKey)}
          alt="Cover"
          width="288"
          height="64"
          class="absolute inset-0 h-full w-full object-cover"
        />
      {/if}
    </div>
    <div class="card-body relative z-10 -mt-8 p-4">
      <a href={resolve(`/@${user.username}`)}>
        <div class="flex items-center gap-3">
          <div
            class="rounded-full border border-base-300/80 bg-base-100 p-1 dark:border-white/10 dark:bg-slate-800"
          >
            <Avatar
              name={user.name}
              size="lg"
              photoKey={user.profilePhotoKey}
            />
          </div>
          <div class="min-w-0 pt-6">
            <p class="truncate font-bold">{user.name}</p>
            <p class="muted-text text-sm">
              @{user.username}
            </p>
          </div>
        </div>
      </a>
      {@render stats(false)}
    </div>
  </GlassCard>
{/if}
