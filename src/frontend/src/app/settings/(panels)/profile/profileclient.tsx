'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditProfile from '@/app/settings/_components/editprofile';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import type { User } from '@/shared/types';

export default function ProfileClient({ user }: { user: User }) {
  const apiClient = useAPI();
  const toast = useToast();
  const router = useRouter();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateUser = useCallback(async (name: string, username: string, email: string, bio: string, profilePhotoKey?: string, coverPhotoKey?: string) => {
    try {
      setUpdateError(null);
      await apiClient.updateUser(user.id, name, username, email, bio, profilePhotoKey, coverPhotoKey);
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (e: any) {
      setUpdateError(e.message || 'Failed to update profile');
      throw e;
    }
  }, [apiClient, router, toast, user.id]);

  return <EditProfile user={user} updateUser={updateUser} error={updateError} />;
}
