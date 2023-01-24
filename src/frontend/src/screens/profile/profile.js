import React from 'react';

import ControlBar from './controlbar';
import UserHeader from './userheader';
import {useRouter} from '../../shared/router/router';
import './profile.scss';

const ThoughtList = React.lazy(() => import('../../shared/components/thoughtlist/thoughtlist'));
const UserList = React.lazy(() => import('../../shared/components/userlist/userlist'));

function Profile() {
  const router = useRouter();
  const user = {name: 'John', username: 'john', email: 'email@mail.com'};

  const resolveComponent = () => {
    if (router.path.endsWith('/following')) {
      return <UserList users={[user]} />;
    } else if (router.path.endsWith('/followers')) {
      return <UserList users={[user]} />;
    } else if (router.path.endsWith('/likes')) {
      return <ThoughtList posts={[]} />;
    }
    return <ThoughtList posts={[]} />;
  };

  return (
    <div className='profile-container'>
      <UserHeader user={user} />
      <ControlBar user={user} />

      <div className='profile-content main-content'>
        {resolveComponent()}
      </div>
    </div>
  );
}

export default Profile;
