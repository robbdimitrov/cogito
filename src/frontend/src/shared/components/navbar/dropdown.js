import React from 'react';

import Link from '../../router/link';
import './dropdown.scss';

function Dropdown({user, logoutUser}) {
  return (
    <div className="dropdown">
      <ul className="dropdown-list">
        <li className="dropdown-item">
          <Link href={`/${user.id}`} className="dropdown-button">
            <span className="dropdown-item-title">
              Profile
            </span>
          </Link>
        </li>

        <li className="dropdown-item">
          <Link href="/settings" className="dropdown-button">
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
