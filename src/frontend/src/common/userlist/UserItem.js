import React from 'react';
import PropTypes from 'prop-types';

import './UserItem.scss';

function UserItem({ user }) {
  return (
    <li className="user-item container user-card">
      <div className="cover"></div>

      <div className="content">
        <div className="header">
          <img
            className="avatar"
            src={user.avatar}
            alt={user.name}
          />

          <button className="follow-button outline-button">
            Follow
          </button>
        </div>

        <div className="texts">
          <p className="title semibold">{user.name}</p>
          <p className="subtitle light">@{user.username}</p>

          <p className="bio">
            {user.bio}
          </p>
        </div>
      </div>
    </li>
  );
}

UserItem.propTypes = {
  user: PropTypes.object.isRequired
};

export default UserItem;
