'use client';

import React, { useCallback, useState } from 'react';
import Password from '@/app/settings/_components/password';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import type { User } from '@/shared/types';

export default function PasswordClient({ user }: { user: User }) {
  const apiClient = useAPI();
  const toast = useToast();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const updatePassword = useCallback(async (password: string, oldPassword: string) => {
    try {
      setPasswordError(null);
      await apiClient.updatePassword(user.id, password, oldPassword);
      toast.success('Password updated successfully');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to update password');
      throw e;
    }
  }, [apiClient, toast, user.id]);

  return <Password updatePassword={updatePassword} error={passwordError} />;
}
