import React from 'react';
import SettingsMenu from './settingsmenu/settingsmenu';
import {useRouter} from '../../shared/router/router';

const Password = React.lazy(() => import('./password'));
const EditProfile = React.lazy(() => import('./editprofile'));
const Sessions = React.lazy(() => import('./sessions'));

function Settings(props) {
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: '', bio: ''};

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <SettingsMenu />
        </div>
        <div className="md:col-span-3">
          {router.path.endsWith('/password')
            ? <Password updatePassword={props.updatePassword || (() => {})} error={props.passwordError} />
            : router.path.endsWith('/sessions')
            ? <Sessions sessions={props.sessions || []} fetchSessions={props.fetchSessions || (() => Promise.resolve())} sessionsError={props.sessionsError} deleteSession={props.deleteSession || (() => Promise.resolve())} />
            : <EditProfile user={user} updateUser={props.updateUser || (() => {})} error={props.updateError} />
          }
        </div>
      </div>
    </div>
  );
}

export default Settings;
