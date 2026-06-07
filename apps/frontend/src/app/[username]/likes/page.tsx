import { notFound } from 'next/navigation';
import PostTab from '@/app/[username]/posttab';
import { fetchServer, getCurrentUser, getUserByUsername, hydratePostAuthors } from '@/shared/services/serverapi';
import { normalizeUsername } from '@/app/[username]/routeutils';
import type { Post } from '@/shared/types';

export default async function LikesPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await getUserByUsername(normalizeUsername(username));

  if (!profileUser) {
    notFound();
  }

  let likes: Post[] = [];
  try {
    const data = await fetchServer<{ items: Post[] }>(`/users/${profileUser.id}/likes?page=0`);
    if (data && data.items) {
      likes = await hydratePostAuthors(data.items);
    }
  } catch (e) {
    console.error('Likes error:', e);
  }

  const currentUser = await getCurrentUser();

  return (
    <PostTab
      user={profileUser}
      posts={likes}
      currentUserId={currentUser?.id}
      emptyMessage="No liked posts yet."
    />
  );
}
