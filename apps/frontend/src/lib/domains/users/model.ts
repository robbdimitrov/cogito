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
