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
  rethoughtByUserId?: string;
  rethoughtByUser?: User;
}

export interface Session {
  id: string;
  userId: string;
  token?: string;
}
