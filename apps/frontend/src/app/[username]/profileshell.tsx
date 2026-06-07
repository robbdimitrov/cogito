'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '@/shared/contexts/apicontext';
import ControlBar from '@/app/[username]/_components/controlbar';
import UserHeader from '@/app/[username]/_components/userheader';
import type { User } from '@/shared/types';

interface ProfileShellProps {
  user: User;
  currentUser?: User | null;
  children: React.ReactNode;
}

function ProfileShell({ user, currentUser, children }: ProfileShellProps) {
  const apiClient = useAPI();
  const router = useRouter();

  const handleFollow = async (userId: string) => {
    try {
      await apiClient.followUser(userId);
      router.refresh();
    } catch (e: unknown) {}
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await apiClient.unfollowUser(userId);
      router.refresh();
    } catch (e: unknown) {}
  };

  return (
    <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
      <UserHeader
        user={user}
        currentUser={currentUser}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
      />
      <ControlBar user={user} />
      <div className="mt-3 sm:mt-4">{children}</div>
    </main>
  );
}

export default ProfileShell;
