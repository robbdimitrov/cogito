export interface User {
  id: string;
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
}

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

export interface Session {
  id: string;
  userId: string;
  token?: string;
}
