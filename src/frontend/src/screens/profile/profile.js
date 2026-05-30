import React from 'react';
import ControlBar from './controlbar';
import UserHeader from './userheader';
import {ProfileSkeleton} from '../../shared/components/skeleton/skeleton';
import {useRouter} from '../../shared/router/router';

const ThoughtList = React.lazy(() => import('../../shared/components/thoughtlist/thoughtlist'));
const UserList = React.lazy(() => import('../../shared/components/userlist/userlist'));

function Profile(props) {
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: '', posts: 0, following: 0, followers: 0, likes: 0};
  const posts = props.posts || [];
  const users = props.users || [];
  const { isLoading, onLike, onRepost, currentUser, onFollow, onUnfollow, onDeletePost } = props;

  const resolveComponent = () => {
    if (router.path.endsWith('/following')) {
      return <UserList users={users} />;
    } else if (router.path.endsWith('/followers')) {
      return <UserList users={users} />;
    } else if (router.path.endsWith('/likes')) {
      return <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} onDelete={onDeletePost} currentUserId={currentUser?.id} />;
    }
    return <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} onDelete={onDeletePost} currentUserId={currentUser?.id} />;
  };

  const match = router.path.match(/\/@(\w+)/);
  const pathUsername = match ? match[1] : '';
  const isSameUser = user && user.username && user.username.toLowerCase() === pathUsername.toLowerCase();
  const showSkeleton = isLoading && !isSameUser;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {showSkeleton ? <ProfileSkeleton /> : (
        <>
          <UserHeader user={user} currentUser={currentUser} onFollow={onFollow} onUnfollow={onUnfollow} />
          <ControlBar user={user} />
          <div className="mt-4">
            {resolveComponent()}
          </div>
        </>
      )}
    </div>
  );
}

export default Profile;
