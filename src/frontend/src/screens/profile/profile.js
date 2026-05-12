import React from 'react';

import ControlBar from './controlbar';
import UserHeader from './userheader';
import {useRouter} from '../../shared/router/router';
import './profile.scss';

const ThoughtList = React.lazy(() => import('../../shared/components/thoughtlist/thoughtlist'));
const UserList = React.lazy(() => import('../../shared/components/userlist/userlist'));

function Profile(props) {
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: '', posts: 0, following: 0, followers: 0, likes: 0};
  const posts = props.posts || [];
  const users = props.users || [];

  const resolveComponent = () => {
    if (router.path.endsWith('/following')) {
      return <UserList users={users} />;
    } else if (router.path.endsWith('/followers')) {
      return <UserList users={users} />;
    } else if (router.path.endsWith('/likes')) {
      return <ThoughtList posts={posts} users={[user]} />;
    }
    return <ThoughtList posts={posts} users={[user]} />;
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
