import type { User } from "$lib/domains/users/model";

export type NotificationType = "like" | "repost" | "reply" | "follow";

export interface Notification {
  id: number;
  externalId: number;
  userId: number;
  actorId: number;
  type: NotificationType | string;
  entityId: string;
  read: boolean;
  created: string;
  actor?: User;
}
