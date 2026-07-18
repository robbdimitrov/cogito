<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Pathname } from "$app/types";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import type { Notification } from "$lib/domains/notifications/model";
  import { Bell } from "@lucide/svelte";

  let { data } = $props();

  const pagination = createPagination<Notification>(
    () => ({ items: data.notifications, nextCursor: data.nextCursor }),
    async (cursor) => {
      const res = await fetch(
        `/notifications?cursor=${encodeURIComponent(cursor)}`,
      );
      return res.ok ? res.json() : { items: [], nextCursor: null };
    },
  );

  function notificationLabel(type: string): string {
    switch (type) {
      case "like":
        return "liked your post";
      case "repost":
        return "reposted your post";
      case "reply":
        return "replied to your post";
      case "follow":
        return "followed you";
      default:
        return "interacted with you";
    }
  }

  function notificationHref(notification: Notification): string {
    if (notification.type === "follow") {
      return notification.actor?.username
        ? resolve(`/@${notification.actor.username}`)
        : resolve("/notifications");
    }
    return resolve(`/posts/${notification.entityId}`);
  }

  function actorName(notification: Notification): string {
    return notification.actor?.name ?? `User ${notification.actorId}`;
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    if (Number.isNaN(diff)) return "";

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return "just now";
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
</script>

<svelte:head>
  <title>Notifications - Cogito</title>
</svelte:head>

<main class="feed-shell">
  <section class="flex flex-col gap-3 sm:gap-4">
    <h1 class="px-1 text-2xl font-bold text-base-content">Notifications</h1>

    {#if pagination.items.length === 0}
      <GlassCard>
        <div class="card-body muted-text items-center py-12 text-center">
          <Bell
            class="mb-2 size-12 text-base-content opacity-50"
            aria-hidden="true"
          />
          <p>No notifications yet</p>
        </div>
      </GlassCard>
    {:else}
      <ul class="space-y-3">
        {#each pagination.items as notification (notification.id)}
          <GlassCard as="li" interactive class="hover:scale-[1.005]">
            <a
              href={resolve(notificationHref(notification) as Pathname)}
              class="card-body flex-row items-start gap-3 p-4 sm:p-5"
            >
              <div
                class="shrink-0 rounded-full bg-base-100/55 p-1 ring-1 ring-base-300/80 dark:bg-white/5 dark:ring-white/10"
              >
                <Avatar
                  name={actorName(notification)}
                  photoKey={notification.actor?.profilePhotoKey}
                  size="md"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm leading-6 text-base-content/80">
                  <span class="font-semibold text-base-content">
                    {actorName(notification)}
                  </span>
                  {notificationLabel(notification.type)}
                </p>
                <p class="muted-text text-xs">
                  {formatRelativeTime(notification.created)}
                </p>
              </div>
              {#if !notification.read}
                <span
                  class="mt-2 size-2 shrink-0 rounded-full bg-primary"
                  aria-label="Unread"
                ></span>
              {/if}
            </a>
          </GlassCard>
        {/each}
      </ul>
    {/if}

    {#if !pagination.done}
      <div class="py-4 text-center">
        <button
          type="button"
          class="btn btn-outline btn-sm rounded-full"
          disabled={pagination.loading}
          onclick={() => pagination.more()}
        >
          {#if pagination.loading}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            Load more
          {/if}
        </button>
      </div>
    {/if}
  </section>
</main>
