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
