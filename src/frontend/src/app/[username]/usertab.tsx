'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '@/shared/contexts/apicontext';
import UserList from '@/app/[username]/_components/userlist';
import type { User } from '@/shared/types';

interface UserTabProps {
  users: User[];
  currentUserId?: string | null;
  emptyMessage: string;
}

function UserTab({ users, currentUserId, emptyMessage }: UserTabProps) {
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
    <UserList
      users={users}
      onFollow={handleFollow}
      onUnfollow={handleUnfollow}
      currentUserId={currentUserId}
      emptyMessage={emptyMessage}
    />
  );
}

export default UserTab;
