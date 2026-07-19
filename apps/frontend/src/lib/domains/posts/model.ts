import type { User } from "$lib/domains/users/model";

export interface Post {
  id: number;
  content: string;
  userId: number;
  created: string;
  likes: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
  user?: User;
  repostOfId?: number;
  repostOf?: Post;
  mediaKey?: string;
  replies: number;
  inReplyToId?: number;
  inReplyToUsername?: string;
  quoteOfId?: number;
  quotePost?: Post;
}
