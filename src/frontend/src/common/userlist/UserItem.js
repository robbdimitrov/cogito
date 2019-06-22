import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import './UserItem.scss';

function UserItem({ user }) {
  return (
    <li className="user-item container user-card">
      <div className="cover"></div>

      <div className="content">
        <div className="header">
          <Link to={`/${user.username}`}>
            <img
              className="avatar"
              src={user.avatar}
              alt={user.name}
            />
          </Link>

          <button className="follow-button outline-button">
            Follow
          </button>
        </div>

        <div className="texts">
          <Link to={`/${user.username}`}>
            <p className="title semibold">{user.name}</p>
            <p className="subtitle light">@{user.username}</p>
          </Link>

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
