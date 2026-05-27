import React from 'react';
import UserItem from './useritem';

function UserList(props) {
  if (!props.users || props.users.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-base-content/60 py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <p>No users to show.</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {props.users.map((user) => (
        <UserItem key={user.id} user={user} />
      ))}
    </ul>
  );
}

export default UserList;
