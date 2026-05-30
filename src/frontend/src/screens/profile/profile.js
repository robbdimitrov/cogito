import React from 'react';
import ControlBar from './controlbar';
import UserHeader from './userheader';
import {ProfileSkeleton} from '../../shared/components/skeleton/skeleton';
import {useRouter} from '../../shared/router/router';
import GlassCard from '../../shared/components/ui/surface';

const ThoughtList = React.lazy(() => import('../../shared/components/thoughtlist/thoughtlist'));
const UserList = React.lazy(() => import('../../shared/components/userlist/userlist'));

function Profile(props) {
  const router = useRouter();
  const user = props.user || {name: '', username: '', email: '', posts: 0, following: 0, followers: 0, likes: 0};
  const posts = props.posts || [];
  const likes = props.likes || [];
  const following = props.following || [];
  const followers = props.followers || [];
  const { isLoading, onLike, onRepost, currentUser, onFollow, onUnfollow, onDeletePost } = props;

  const renderTabContent = (items, emptyMessage, renderFn) => {
    const isTabEmpty = !items || items.length === 0;
    if (isLoading && isTabEmpty) {
      return (
        <GlassCard className="flex flex-col items-center justify-center space-y-3 py-12">
          <span className="loading loading-spinner text-primary loading-lg"></span>
          <span className="text-sm text-base-content/50">Fetching details...</span>
        </GlassCard>
      );
    }
    return (
      <div className="relative">
        {isLoading && !isTabEmpty && (
          <div className="flex justify-center mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100/80 backdrop-blur-md rounded-full shadow-sm border border-base-200/50 text-xs text-base-content/60">
              <span className="loading loading-spinner loading-xs text-primary"></span>
              Updating...
            </div>
          </div>
        )}
        {renderFn()}
      </div>
    );
  };

  const resolveComponent = () => {
    if (router.path.endsWith('/following')) {
      return renderTabContent(
        following,
        'Not following anyone yet.',
        () => <UserList users={following} onFollow={onFollow} onUnfollow={onUnfollow} currentUserId={currentUser?.id} emptyMessage="Not following anyone yet." />
      );
    } else if (router.path.endsWith('/followers')) {
      return renderTabContent(
        followers,
        'No followers yet.',
        () => <UserList users={followers} onFollow={onFollow} onUnfollow={onUnfollow} currentUserId={currentUser?.id} emptyMessage="No followers yet." />
      );
    } else if (router.path.endsWith('/likes')) {
      return renderTabContent(
        likes,
        'No liked thoughts yet.',
        () => <ThoughtList posts={likes} users={[user]} onLike={onLike} onRepost={onRepost} onDelete={onDeletePost} currentUserId={currentUser?.id} emptyMessage="No liked thoughts yet." />
      );
    }
    return renderTabContent(
      posts,
      'No thoughts posted yet.',
      () => <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} onDelete={onDeletePost} currentUserId={currentUser?.id} emptyMessage="No thoughts yet. Share what's on your mind!" />
    );
  };

  const match = router.path.match(/\/@(\w+)/);
  const pathUsername = match ? match[1] : '';
  const isSameUser = user && user.username && user.username.toLowerCase() === pathUsername.toLowerCase();
  const showSkeleton = isLoading && !isSameUser;

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
      {showSkeleton ? <ProfileSkeleton /> : (
        <>
          <UserHeader user={user} currentUser={currentUser} onFollow={onFollow} onUnfollow={onUnfollow} />
          <ControlBar user={user} />
          <div className="mt-6">
            {resolveComponent()}
          </div>
        </>
      )}
    </main>
  );
}

export default Profile;
