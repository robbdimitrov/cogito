import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import './UserHeader.scss';

function UserHeader({user}) {
  return (
    <div className="user-header container">
      <div className="cover"></div>

      <div className="content main-content">
        <img
          className="avatar"
          src={user.avatar}
          alt={user.name}
        />

        <button className="follow-button outline-button">
          Follow
        </button>

        <div className="texts">
          <span className="name bold">{user.name}</span>
          <span className="username">@{user.username}</span>
          <p className="bio">{user.bio}</p>

          <div className="join-date">
            <FontAwesomeIcon icon="calendar-alt" className="join-date-icon" />
            <span className="join-date-text">Joined March 2011</span>
          </div>
        </div>
      </div>
    </div>
  );
}

UserHeader.propTypes = {
  user: PropTypes.object.isRequired
};

export default UserHeader;
