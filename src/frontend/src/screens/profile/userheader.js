import React from 'react';
import Link from '../../shared/router/link';
import Avatar from '../../shared/components/avatar/avatar';
import { Pen, Check, UserPlus, Calendar } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
}

function UserHeader({user, currentUser, onFollow, onUnfollow}) {
  const isOwnProfile = currentUser && currentUser.id === user.id;

  function handleFollowClick() {
    if (user.followed) {
      onUnfollow(user.id);
    } else {
      onFollow(user.id);
    }
  }

  return (
    <div className="card glass-card overflow-hidden rounded-2xl animate-slide-in">
      <div className="h-32 bg-gradient-to-tr from-primary via-primary/80 to-secondary relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
      </div>
      <div className="card-body px-6 pb-6 -mt-12 relative">
        <div className="flex justify-between items-end">
          <div className="relative">
            <Avatar name={user.name} size="xl" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-base-100"></div>
          </div>
          {isOwnProfile ? (
            <Link href="/settings/profile" className="btn btn-outline btn-sm gap-1 rounded-full px-4">
              <Pen className="h-4 w-4" />
              Edit Profile
            </Link>
          ) : (
            <button
              className={`btn btn-sm gap-1 rounded-full px-4 ${user.followed ? 'btn-outline' : 'btn-primary'}`}
              onClick={handleFollowClick}
            >
              {user.followed ? (
                <>
                  <Check className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
        <div className="mt-3">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-base-content/60">@{user.username}</p>
          {user.bio && <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">{user.bio}</p>}
          <div className="flex items-center gap-2 mt-3 text-sm text-base-content/60">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(user.created)}</span>
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-base-200">
          <Link href={`/@${user.username}`} className="flex gap-1 hover:opacity-80 transition-opacity">
            <span className="font-bold">{user.posts ?? 0}</span>
            <span className="text-base-content/60 text-sm">Thoughts</span>
          </Link>
          <Link href={`/@${user.username}/following`} className="flex gap-1 hover:opacity-80 transition-opacity">
            <span className="font-bold">{user.following ?? 0}</span>
            <span className="text-base-content/60 text-sm">Following</span>
          </Link>
          <Link href={`/@${user.username}/followers`} className="flex gap-1 hover:opacity-80 transition-opacity">
            <span className="font-bold">{user.followers ?? 0}</span>
            <span className="text-base-content/60 text-sm">Followers</span>
          </Link>
          <Link href={`/@${user.username}/likes`} className="flex gap-1 hover:opacity-80 transition-opacity">
            <span className="font-bold">{user.likes ?? 0}</span>
            <span className="text-base-content/60 text-sm">Likes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UserHeader;
