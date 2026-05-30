import React from 'react';
import UserItem from './useritem';
import { Users } from 'lucide-react';

function UserList(props) {
  if (!props.users || props.users.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-base-content/60 py-12">
          <Users className="h-12 w-12 mb-2 opacity-50" />
          <p>No users to show.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {props.users.map((user) => (
        <UserItem key={user.id} user={user} onFollow={props.onFollow} onUnfollow={props.onUnfollow} />
      ))}
    </ul>
  );
}

export default UserList;
