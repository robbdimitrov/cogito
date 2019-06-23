import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import './UserDropdown.scss';

function UserDropdown({ user }) {
  return (
    <div className="dropdown">
      <ul className="dropdown-list">
        <li className="dropdown-item">
          <Link to={`/${user.username}`} className="dropdown-button">
            <span className="dropdown-item-title">
              Profile
            </span>
          </Link>
        </li>

        <li className="dropdown-item">
          <Link to="/settings" className="dropdown-button">
            <span className="dropdown-item-title">
              Settings
            </span>
          </Link>
        </li>

        <li className="dropdown-item">
          <Link to="/" className="dropdown-button">
            <span className="dropdown-item-title">
              Sign out
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

UserDropdown.propTypes = {
  user: PropTypes.object.isRequired
};

export default UserDropdown;
