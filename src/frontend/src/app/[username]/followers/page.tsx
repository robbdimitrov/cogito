import { notFound } from 'next/navigation';
import UserTab from '@/app/[username]/usertab';
import { fetchServer, getCurrentUser, getUserByUsername } from '@/shared/services/serverapi';
import { normalizeUsername } from '@/app/[username]/routeutils';
import type { User } from '@/shared/types';

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await getUserByUsername(normalizeUsername(username));

  if (!profileUser) {
    notFound();
  }

  let followers: User[] = [];
  try {
    const data = await fetchServer<{ items: User[] }>(`/users/${profileUser.id}/followers?page=0&limit=20`);
    followers = data && data.items ? data.items : [];
  } catch (e) {
    console.error('Followers error:', e);
  }

  const currentUser = await getCurrentUser();

  return (
    <UserTab
      users={followers}
      currentUserId={currentUser?.id}
      emptyMessage="No followers yet."
    />
  );
}
