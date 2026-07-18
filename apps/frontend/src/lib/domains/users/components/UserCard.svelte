<script lang="ts">
  import { resolve } from "$app/paths";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import type { User } from "$lib/domains/users/model";

  let { user } = $props<{ user: User }>();
</script>

<GlassCard
  as="a"
  href={resolve(`/@${user.username}`)}
  interactive
  class="block overflow-hidden"
>
  <div class="flex items-center gap-3 p-3">
    <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
    <span class="min-w-0 flex-1">
      <span class="block truncate font-bold leading-tight">{user.name}</span>
      <span class="muted-text block truncate text-sm">@{user.username}</span>
    </span>
    <span class="muted-text hidden shrink-0 text-xs sm:block">
      <span class="font-bold text-base-content">{user.posts ?? 0}</span> Cogito
      <span class="mx-1">·</span>
      <span class="font-bold text-base-content">{user.following ?? 0}</span>
      Following
      <span class="mx-1">·</span>
      <span class="font-bold text-base-content">{user.followers ?? 0}</span> Followers
    </span>
  </div>
</GlassCard>
