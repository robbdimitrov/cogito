'use client';

import React from 'react';
import SettingsMenu from '@/app/settings/[[...tab]]/settingsmenu';
import {usePathname} from 'next/navigation';
const Password = React.lazy(() => import('@/app/settings/[[...tab]]/password'));
const EditProfile = React.lazy(() => import('@/app/settings/[[...tab]]/editprofile'));
const Sessions = React.lazy(() => import('@/app/settings/[[...tab]]/sessions'));

function Settings(props) {
  const pathname = usePathname();
  const activeTabMatch = pathname.match(/\/settings\/(\w+)/);
  const activeTab = activeTabMatch ? activeTabMatch[1] : 'account';
  const user = props.user || {name: '', username: '', email: '', bio: ''};

  return (
    <main className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(17rem,30%)_minmax(0,1fr)] md:gap-6 lg:gap-8">
        <div className="min-w-0">
          <SettingsMenu />
        </div>
        <div className="min-w-0">
          {pathname.endsWith('/password')
            ? <Password updatePassword={props.updatePassword || (() => {})} error={props.passwordError} />
            : pathname.endsWith('/sessions')
            ? <Sessions sessions={props.sessions || []} currentSessionId={props.currentSessionId} fetchSessions={props.fetchSessions || (() => Promise.resolve())} sessionsError={props.sessionsError} deleteSession={props.deleteSession || (() => Promise.resolve())} />
            : <EditProfile user={user} updateUser={props.updateUser || (() => {})} error={props.updateError} />
          }
        </div>
      </div>
    </main>
  );
}

export default Settings;
