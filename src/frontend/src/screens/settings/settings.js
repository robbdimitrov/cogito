import React from 'react';

import SettingsMenu from './settingsmenu/settingsmenu';
import './settings.scss';
import {useRouter} from '../../shared/router/router';

const Password = React.lazy(() => import('./password'));
const EditProfile = React.lazy(() => import('./editprofile'));

function Settings(props) {
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: '', bio: ''};

  return (
    <div className='settings-container'>
      <SettingsMenu />

      <div className='settings-content main-content'>
        {router.path.endsWith('/password')
          ? <Password updatePassword={props.updatePassword || (() => {})} error={props.passwordError} />
          : <EditProfile user={user} updateUser={props.updateUser || (() => {})} error={props.updateError} />
        }
      </div>
    </div>
  );
}

export default Settings;
