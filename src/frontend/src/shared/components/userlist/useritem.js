import React from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';

function UserItem({user}) {
  return (
    <li className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <Link href={`/@${user.username}`} className="flex items-center gap-3 min-w-0">
            <Avatar name={user.name} size="md" />
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
