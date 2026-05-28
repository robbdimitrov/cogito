import React from 'react';
import Link from '../../shared/router/link';

function UserCard({user}) {
  return (
    <div className="card bg-base-100/90 backdrop-blur-sm border border-base-200/80 shadow-sm sticky top-20 overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-primary/80 to-secondary/80"></div>
      <div className="card-body p-4 -mt-8">
        <Link href={`/@${user.username}`}>
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-gradient-to-br from-primary to-secondary text-primary-content rounded-full w-14 ring-4 ring-base-100 shadow-md">
                <span className="text-xl font-bold">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
              </div>
            </div>
            <div className="min-w-0 pt-6">
              <p className="font-bold truncate">{user.name}</p>
              <p className="text-sm text-base-content/60">@{user.username}</p>
            </div>
          </div>
        </Link>

        <div className="flex justify-around mt-4 pt-4 border-t border-base-200/60">
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.posts ?? 0}</p>
            <p className="text-xs text-base-content/50 mt-1">Thoughts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.following ?? 0}</p>
            <p className="text-xs text-base-content/50 mt-1">Following</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.followers ?? 0}</p>
            <p className="text-xs text-base-content/50 mt-1">Followers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserCard;
