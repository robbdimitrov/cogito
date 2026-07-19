import type { User } from "$lib/domains/users/model";

export interface Post {
  publicId: string;
  content: string;
  userId: number;
  created: string;
  likes: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
  user?: User;
  repostOfPublicId?: string;
  repostOf?: Post;
  mediaKey?: string;
  replies: number;
  inReplyToPublicId?: string;
  inReplyToUsername?: string;
  quoteOfPublicId?: string;
  quotePost?: Post;
}
