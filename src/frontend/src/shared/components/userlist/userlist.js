import React from 'react';

import UserItem from './useritem';
import './userlist.scss';

function UserList(props) {
  return (
    <ul className="user-list">
      {props.users.map((user) =>
        <UserItem key={user.id} user={user} />
      )}
    </ul>
  );
}

export default UserList;
