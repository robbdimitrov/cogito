import type { User } from "$lib/domains/users/model";

export interface Post {
  id: string;
  content: string;
  userId: string;
  created: string;
  likes: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
  user?: User;
  repostOfId?: string;
  repostOf?: Post;
  mediaKey?: string;
  replies: number;
  inReplyToId?: string;
  quoteOfId?: string;
  quotePost?: Post;
}
