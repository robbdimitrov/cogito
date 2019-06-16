import React from 'react';
import PropTypes from 'prop-types';

import './UserCard.scss';

function UserCard({ user }) {
  return (
    <div className="user-card container">
      <div className="cover"></div>

      <div className="content">
        <img
          className="avatar"
          src={user.avatar}
          alt={user.name}
        />

        <div className="texts">
          <p className="title semibold">{user.name}</p>
          <p className="subtitle light">@{user.username}</p>
        </div>
      </div>

      <div className="counters">
        <div className="counter">
          <span className="counter-label light">Thoughts</span>
          <span className="counter-value">{user.thoughts}</span>
        </div>

        <div className="counter">
          <span className="counter-label light">Following</span>
          <span className="counter-value">{user.following}</span>
        </div>

        <div className="counter">
          <span className="counter-label light">Followers</span>
          <span className="counter-value">{user.followers}</span>
        </div>
      </div>
    </div>
  );
}

UserCard.propTypes = {
  user: PropTypes.object.isRequired
};

export default UserCard;
