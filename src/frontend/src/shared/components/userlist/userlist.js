import React from 'react';

import UserItem from './useritem';
import './userlist.scss';

function UserList(props) {
  if (!props.users || props.users.length === 0) {
    return <div className="user-list empty">No users to show.</div>;
  }

  return (
    <ul className="user-list">
      {props.users.map((user) =>
        <UserItem key={user.id} user={user} />
      )}
    </ul>
  );
}

export default UserList;
