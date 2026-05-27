import React from 'react';
import Link from '../../shared/router/link';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `Joined ${date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`;
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
      <div className="h-24 bg-gradient-to-r from-primary to-secondary"></div>
      <div className="card-body px-6 pb-6 -mt-10">
        <div className="flex justify-between items-end">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-20 ring-4 ring-base-100">
              <span className="text-2xl font-bold">{user.name?.charAt(0).toUpperCase() || '?'}</span>
            </div>
          </div>
          {isOwnProfile ? (
            <Link href="/settings/profile" className="btn btn-outline btn-sm">Edit Profile</Link>
          ) : (
            <button
              className={`btn btn-sm ${user.followed ? 'btn-outline' : 'btn-primary'}`}
              onClick={handleFollowClick}
            >
              {user.followed ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <div className="mt-3">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-base-content/60">@{user.username}</p>
          {user.bio && <p className="mt-2 whitespace-pre-wrap">{user.bio}</p>}
          <div className="flex items-center gap-2 mt-3 text-sm text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>{formatDate(user.created)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHeader;
