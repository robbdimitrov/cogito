<script lang="ts">
  import { resolve } from "$app/paths";
  import type { Pathname } from "$app/types";
  import { onMount } from "svelte";
  import Avatar from "$lib/shared/components/ui/Avatar.svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import EmptyState from "$lib/shared/components/ui/EmptyState.svelte";
  import { createPagination } from "$lib/shared/createPagination.svelte";
  import { pageTitle } from "$lib/shared/pageTitle";
  import type { Notification } from "$lib/domains/notifications/model";
  import {
    Bell,
    Heart,
    MessageSquare,
    Repeat,
    UserPlus,
    type LucideIcon,
  } from "@lucide/svelte";

  let { data } = $props();

  // Optimistic overlay: ids marked read without awaiting the fire-and-forget backend call.
  let locallyRead = $state(new Set<number>());

  // Fires only from onMount, never a GET, so speculative preloads can't trigger it.
  function markUnreadIds(ids: number[]) {
    if (ids.length === 0) return;
    locallyRead = new Set([...locallyRead, ...ids]);
    void fetch("/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  onMount(() => {
    markUnreadIds(data.notifications.filter((n) => !n.read).map((n) => n.id));
  });

  const pagination = createPagination<Notification>(
    () => ({ items: data.notifications, nextCursor: data.nextCursor }),
    async (cursor) => {
      const res = await fetch(
        `/notifications?cursor=${encodeURIComponent(cursor)}`,
      );
      return res.ok ? res.json() : { items: [], nextCursor: null };
    },
  );

  interface NotificationTypeMeta {
    label: string;
    icon: LucideIcon;
    badgeClass: string;
  }

  // badgeClass mirrors the action colors PostItem/RepostMenu already use for like/repost/reply.
  const notificationTypeMeta: Record<string, NotificationTypeMeta> = {
    like: {
      label: "liked your post",
      icon: Heart,
      badgeClass: "bg-error/20 text-error",
    },
    repost: {
      label: "reposted your post",
      icon: Repeat,
      badgeClass: "bg-success/20 text-success",
    },
    reply: {
      label: "replied to your post",
      icon: MessageSquare,
      badgeClass: "bg-primary/20 text-primary",
    },
    follow: {
      label: "followed you",
      icon: UserPlus,
      badgeClass: "bg-secondary/20 text-secondary",
    },
  };

  const defaultNotificationTypeMeta: NotificationTypeMeta = {
    label: "interacted with you",
    icon: Bell,
    badgeClass: "bg-base-200 text-base-content",
  };

  function notificationMeta(type: string): NotificationTypeMeta {
    return notificationTypeMeta[type] ?? defaultNotificationTypeMeta;
  }

  function notificationHref(notification: Notification): string {
    if (notification.type === "follow") {
      return notification.actor?.username
        ? `/@${notification.actor.username}`
        : "/notifications";
    }
    return `/posts/${notification.entityId}`;
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
  <title>{pageTitle("Notifications")}</title>
</svelte:head>

<main class="feed-shell">
  <section class="flex flex-col gap-3 sm:gap-4">
    <h1 class="px-1 text-2xl font-bold text-base-content">Notifications</h1>

    {#if pagination.items.length === 0}
      <EmptyState icon={Bell} message="No notifications yet" />
    {:else}
      <ul class="space-y-3">
        {#each pagination.items as notification (notification.id)}
          {@const meta = notificationMeta(notification.type)}
          {@const isRead =
            notification.read || locallyRead.has(notification.id)}
          <GlassCard as="li" interactive class="hover:scale-[1.005]">
            <a
              href={resolve(notificationHref(notification) as Pathname)}
              class="card-body flex-row items-start gap-3 p-4 sm:p-5"
            >
              <div
                class="relative shrink-0 rounded-full bg-base-100/55 p-1 ring-1 ring-base-300/80 dark:bg-white/5 dark:ring-white/10"
              >
                <Avatar
                  name={actorName(notification)}
                  photoKey={notification.actor?.profilePhotoKey}
                  size="md"
                />
                <span
                  class="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-base-100 dark:border-base-200 {meta.badgeClass}"
                  aria-hidden="true"
                >
                  <meta.icon class="size-3" />
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm leading-6 {isRead
                    ? 'text-base-content/60'
                    : 'text-base-content/80'}"
                >
                  <span
                    class="font-semibold {isRead
                      ? 'text-base-content/75'
                      : 'text-base-content'}"
                  >
                    {actorName(notification)}
                  </span>
                  {meta.label}
                </p>
                <p class="muted-text text-xs">
                  {formatRelativeTime(notification.created)}
                </p>
              </div>
              {#if !isRead}
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
