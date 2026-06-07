import { notFound } from 'next/navigation';
import UserTab from '@/app/[username]/usertab';
import { fetchServer, getCurrentUser, getUserByUsername } from '@/shared/services/serverapi';
import { normalizeUsername } from '@/app/[username]/routeutils';
import type { User } from '@/shared/types';

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await getUserByUsername(normalizeUsername(username));

  if (!profileUser) {
    notFound();
  }

  let following: User[] = [];
  try {
    const data = await fetchServer<{ items: User[] }>(`/users/${profileUser.id}/following?page=0&limit=20`);
    following = data && data.items ? data.items : [];
  } catch (e) {
    console.error('Following error:', e);
  }

  const currentUser = await getCurrentUser();

  return (
    <UserTab
      users={following}
      currentUserId={currentUser?.id}
      emptyMessage="Not following anyone yet."
    />
  );
}
