import React from 'react';
import PropTypes from 'prop-types';

import UserItem from './UserItem';
import './UserList.scss';

function UserList({ users }) {
  return (
    <ul className="user-list">
      {users.map((user) =>
        <UserItem key={user.id} user={user} />
      )}
    </ul>
  );
}

UserItem.propTypes = {
  users: PropTypes.array.isRequired
};

export default UserList;
