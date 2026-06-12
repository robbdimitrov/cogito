import { notFound } from 'next/navigation';
import PostTab from '@/app/[username]/posttab';
import { fetchServer, getCurrentUser, getUserByUsername } from '@/shared/services/serverapi';
import { normalizeUsername } from '@/app/[username]/routeutils';
import type { Post } from '@/shared/types';

export default async function UserPostsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await getUserByUsername(normalizeUsername(username));

  if (!profileUser) {
    notFound();
  }

  let posts: Post[] = [];
  try {
    const data = await fetchServer<{ items: Post[] }>(`/users/${profileUser.id}/posts?page=0`);
    if (data && data.items) {
      posts = data.items;
    }
  } catch (e) {
    console.error('Profile posts error:', e);
  }

  const currentUser = await getCurrentUser();

  return (
    <PostTab
      user={profileUser}
      posts={posts}
      currentUserId={currentUser?.id}
      emptyMessage="No posts yet. Share what's on your mind!"
    />
  );
}
