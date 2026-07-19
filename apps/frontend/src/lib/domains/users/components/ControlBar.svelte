<script lang="ts">
  import { page } from "$app/state";
  import type { User } from "$lib/shared/types";
  import TabStrip from "$lib/shared/components/ui/TabStrip.svelte";

  let { user } = $props<{ user: User }>();

  let path = $derived(`/@${user.username}`);

  let tabs = $derived([
    {
      name: "Posts",
      count: user.posts,
      href: path,
      isActive:
        page.url.pathname === path &&
        !page.url.pathname.match(/\/(replies|following|followers|likes)$/),
    },
    {
      name: "Replies",
      href: `${path}/replies`,
      isActive: page.url.pathname.endsWith("/replies"),
    },
    {
      name: "Following",
      count: user.following,
      href: `${path}/following`,
      isActive: page.url.pathname.endsWith("/following"),
    },
    {
      name: "Followers",
      count: user.followers,
      href: `${path}/followers`,
      isActive: page.url.pathname.endsWith("/followers"),
    },
    {
      name: "Likes",
      count: user.likes,
      href: `${path}/likes`,
      isActive: page.url.pathname.endsWith("/likes"),
    },
  ]);
</script>

<TabStrip {tabs} />
