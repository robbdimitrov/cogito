import React from 'react';
import {Link} from 'react-router-dom';

import './Dropdown.scss';

function Dropdown({user, logoutUser}) {
  return (
    <div className="dropdown">
      <ul className="dropdown-list">
        <li className="dropdown-item">
          <Link to={`/${user.id}`} className="dropdown-button">
            <span className="dropdown-item-title">
              Profile
            </span>
          </Link>
        </li>

        <li className="dropdown-item">
          <Link to="/settings" className="dropdown-button">
            <span>Settings</span>
          </Link>
        </li>

        <li className="dropdown-item">
          <div className="dropdown-button" onClick={logoutUser}>
            <span>Sign out</span>
          </div>
        </li>
      </ul>
    </div>
  );
}

export default Dropdown;
