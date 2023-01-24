import React, {useState} from 'react';

import SettingsMenu from './settingsmenu/settingsmenu';
import './settings.scss';
import {useRouter} from '../../shared/router/router';

const Password = React.lazy(() => import('./password'));
const EditProfile = React.lazy(() => import('./editprofile'));

function Settings() {
  const router = useRouter();
  const [user, setUser] = useState({
    name: 'John Doe',
    username: 'username',
    email: 'mail@mail.com',
    bio: 'Awesome bio',
  });

  const updatePassword = () => {};
  const updateUser = (name, username, email, bio) => {
    setUser({name, username, email, bio});
  };

  return (
    <div className='settings-container'>
      <SettingsMenu />

      <div className='settings-content main-content'>
        {router.path.endsWith('/password')
          ? <Password updatePassword={updatePassword} />
          : <EditProfile user={user} setUser={updateUser} />
        }
      </div>
    </div>
  );
}

export default Settings;
