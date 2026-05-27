import React from 'react';
import Link from '../../shared/router/link';

function UserCard({user}) {
  return (
    <div className="card bg-base-100 shadow-sm border border-base-200 sticky top-20">
      <div className="card-body p-4">
        <Link href={`/@${user.username}`}>
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-14">
                <span className="text-xl font-bold">{user.name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-base-content/60">@{user.username}</p>
            </div>
          </div>
        </Link>

        <div className="flex justify-around mt-4 pt-4 border-t border-base-200">
          <div className="text-center">
            <p className="font-bold">{user.posts ?? 0}</p>
            <p className="text-xs text-base-content/60">Thoughts</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{user.following ?? 0}</p>
            <p className="text-xs text-base-content/60">Following</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{user.followers ?? 0}</p>
            <p className="text-xs text-base-content/60">Followers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserCard;
