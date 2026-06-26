export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  bio?: string;
  posts: number;
  following: number;
  followers: number;
  likes: number;
  followed?: boolean;
  profilePhotoKey?: string;
  coverPhotoKey?: string;
  created?: string;
}

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
  quoteOfId?: number;
  quotePost?: Post;
}

export type { Session } from "$lib/domains/auth/model";
