import React from 'react';
import Link from '../../shared/router/link';
import Avatar from '../../shared/components/avatar/avatar';

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
    <div className="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-secondary relative">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Edit Profile
            </Link>
          ) : (
            <button
              className={`btn btn-sm gap-1 rounded-full px-4 ${user.followed ? 'btn-outline' : 'btn-primary'}`}
              onClick={handleFollowClick}
            >
              {user.followed ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Following
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
