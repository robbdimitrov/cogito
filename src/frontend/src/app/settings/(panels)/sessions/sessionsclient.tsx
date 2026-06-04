'use client';

import React, { useCallback, useState } from 'react';
import Sessions from '@/app/settings/_components/sessions';
import { useAPI } from '@/shared/contexts/apicontext';
import { useToast } from '@/shared/components/toast/toast';
import type { Session } from '@/shared/types';

interface SessionsClientProps {
  initialSessions: Session[];
  initialCurrentSessionId?: string | null;
}

export default function SessionsClient({ initialSessions, initialCurrentSessionId = null }: SessionsClientProps) {
  const apiClient = useAPI();
  const toast = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState(initialCurrentSessionId);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsError(null);
      const data = await apiClient.getSessions();
      setSessions(data.items || []);
      setCurrentSessionId((data as any).currentSessionId || null);
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

  return (
    <Sessions
      sessions={sessions}
      currentSessionId={currentSessionId}
      sessionsError={sessionsError}
      deleteSession={deleteSession}
    />
  );
}
