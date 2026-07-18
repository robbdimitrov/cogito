<script lang="ts">
  import { resolve } from "$app/paths";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/domains/users/model";

  let { user } = $props<{ user: User }>();
</script>

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
  <div class="subtle-border flex gap-4 border-t px-3 py-2">
    <div>
      <p class="text-sm font-bold leading-none">{user.posts ?? 0}</p>
      <p class="muted-text mt-1 text-xs">Cogito</p>
    </div>
    <div>
      <p class="text-sm font-bold leading-none">{user.following ?? 0}</p>
      <p class="muted-text mt-1 text-xs">Following</p>
    </div>
    <div>
      <p class="text-sm font-bold leading-none">{user.followers ?? 0}</p>
      <p class="muted-text mt-1 text-xs">Followers</p>
    </div>
  </div>
</GlassCard>
