import SessionsClient from '@/app/settings/(panels)/sessions/sessionsclient';
import { getServerSessions } from '@/shared/services/serverapi';

export default async function SessionsSettingsPage() {
  let sessions = [];
  let currentSessionId = null;

  try {
    const data = await getServerSessions();
    sessions = data ? (data.items || data.sessions || []) : [];
    currentSessionId = data?.currentSessionId || null;
  } catch (e) {
    console.error('Sessions error:', e);
  }

  return (
    <SessionsClient
      initialSessions={sessions}
      initialCurrentSessionId={currentSessionId}
    />
  );
}
