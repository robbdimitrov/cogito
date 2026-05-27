import React from 'react';
import Link from '../../router/link';

function UserItem({user}) {
  return (
    <li className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <Link href={`/@${user.username}`} className="flex items-center gap-3 min-w-0">
            <div className="avatar placeholder flex-shrink-0">
              <div className="bg-primary text-primary-content rounded-full w-12">
                <span className="text-lg font-bold">{user.name?.charAt(0).toUpperCase() || '?'}</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-base-content/60">@{user.username}</p>
            </div>
          </Link>
        </div>
        {user.bio && <p className="mt-2 text-sm text-base-content/70 line-clamp-2">{user.bio}</p>}
      </div>
    </li>
  );
}

export default UserItem;
