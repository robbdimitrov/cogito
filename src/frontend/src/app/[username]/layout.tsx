import React from 'react';
import { notFound } from 'next/navigation';
import ProfileShell from '@/app/[username]/profileshell';
import { getCurrentUser, getUserByUsername } from '@/shared/services/serverapi';
import { normalizeUsername } from '@/app/[username]/routeutils';

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profileUser = await getUserByUsername(normalizeUsername(username));

  if (!profileUser) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  return (
    <ProfileShell user={profileUser} currentUser={currentUser}>
      {children}
    </ProfileShell>
  );
}
