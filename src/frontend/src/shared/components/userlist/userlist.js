import React from 'react';
import UserItem from './useritem';
import { Users } from 'lucide-react';

function UserList({ users, onFollow, onUnfollow, emptyMessage = 'No users to show.' }) {
  if (!users || users.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-slate-600 dark:text-slate-300 py-12">
          <Users className="h-12 w-12 mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {users.map((user) => (
        <UserItem key={user.id} user={user} onFollow={onFollow} onUnfollow={onUnfollow} />
      ))}
    </ul>
  );
}

export default UserList;
