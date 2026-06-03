'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SettingsMenu from '@/app/settings/[[...tab]]/settingsmenu';
import { usePathname, useRouter } from 'next/navigation';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import { Session } from '@/shared/types';

const Password = React.lazy(() => import('@/app/settings/[[...tab]]/password'));
const EditProfile = React.lazy(() => import('@/app/settings/[[...tab]]/editprofile'));
const Sessions = React.lazy(() => import('@/app/settings/[[...tab]]/sessions'));
const SettingsHome = React.lazy(() => import('@/app/settings/[[...tab]]/settingshome'));

function Settings(props) {
  const pathname = usePathname();
  const user = props.user || { id: '', name: '', username: '', email: '', bio: '' };

  const apiClient = useAPI();
  const toast = useToast();
  const router = useRouter();

  // State for updating profile
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // State for changing password
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // State for active sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsError(null);
      const data = await apiClient.getSessions();
      if (data) {
        setSessions(data.items || []);
        // Note: data.currentSessionId is not in the type definition, we may need to assert or type it better if it's there
        setCurrentSessionId((data as any).currentSessionId || null);
      }
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : 'Failed to load sessions');
    }
  }, [apiClient]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.deleteSession(sessionId);
      toast.success('Session terminated successfully');
      await fetchSessions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to terminate session');
    }
  }, [apiClient, fetchSessions, toast]);

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
  }, [apiClient, user.id, toast, router]);

  const updatePassword = useCallback(async (password: string, oldPassword: string) => {
    try {
      setPasswordError(null);
      await apiClient.updatePassword(user.id, password, oldPassword);
      toast.success('Password updated successfully');
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to update password');
      throw e;
    }
  }, [apiClient, user.id, toast]);

  const isSettingsHome = pathname === '/settings' || pathname === '/settings/';

  if (isSettingsHome) {
    return (
      <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
        <SettingsHome />
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[minmax(17rem,30%)_minmax(0,1fr)] md:gap-6 lg:gap-8">
        <div className="min-w-0">
          <SettingsMenu />
        </div>
        <div className="min-w-0">
          {pathname.endsWith('/password') ? (
            <Password updatePassword={updatePassword} error={passwordError} />
          ) : pathname.endsWith('/sessions') ? (
            <Sessions
              sessions={sessions}
              currentSessionId={currentSessionId}
              fetchSessions={fetchSessions}
              sessionsError={sessionsError}
              deleteSession={deleteSession}
            />
          ) : (
            <EditProfile user={user} updateUser={updateUser} error={updateError} />
          )}
        </div>
      </div>
    </main>
  );
}

export default Settings;
