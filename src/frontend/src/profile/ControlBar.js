import React from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';

import './ControlBar.scss';

function ControlBar({ user, path }) {
  return (
    <div className="control-bar-container bottom-shadow">
      <div className="control-bar main-content">
        <nav className="counters">
          <NavLink to={path} exact className="counter thoughts">
            <span className="counter-label">Thoughts</span>
            <span className="counter-value">{user.posts}</span>
          </NavLink>

          <NavLink to={`${path}/following`} className="counter following">
            <span className="counter-label">Following</span>
            <span className="counter-value">{user.following}</span>
          </NavLink>

          <NavLink to={`${path}/followers`} className="counter followers">
            <span className="counter-label">Followers</span>
            <span className="counter-value">{user.followers}</span>
          </NavLink>

          <NavLink to={`${path}/likes`} className="counter likes">
            <span className="counter-label">Likes</span>
            <span className="counter-value">{user.likes}</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}

ControlBar.propTypes = {
  user: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired
};

export default ControlBar;
