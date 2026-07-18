<script lang="ts">
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { getComposeContext } from "$lib/domains/posts/compose.svelte";
  import type { User } from "$lib/domains/users/model";

  let { user } = $props<{ user: User }>();
  const compose = getComposeContext();
</script>

<GlassCard
  as="button"
  type="button"
  interactive
  onclick={() => compose.open()}
  class="block w-full text-left"
>
  <div class="flex items-center gap-3 p-3">
    <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
    <span class="muted-text">What's on your mind?</span>
  </div>
</GlassCard>
