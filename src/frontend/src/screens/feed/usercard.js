import React from 'react';
import Link from '../../shared/router/link';
import Avatar from '../../shared/components/avatar/avatar';

function UserCard({user}) {
  return (
    <div className="card glass-card sticky top-20 overflow-hidden rounded-2xl">
      <div className="h-16 bg-gradient-to-r from-primary/70 to-secondary/70"></div>
      <div className="card-body p-4 -mt-8">
        <Link href={`/@${user.username}`}>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="lg" />
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
