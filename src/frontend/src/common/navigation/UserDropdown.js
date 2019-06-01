import React from 'react';

import { Link } from 'react-router-dom';

import './UserDropdown.scss';

function UserDropdown(props) {
  return (
    <div className='dropdown'>
      <ul className='dropdown-list'>
        <li className='dropdown-item'>
          <Link to='/user' className='dropdown-button'>
            <span className='dropdown-item-title'>
              Profile
            </span>
          </Link>
        </li>

        <li className='dropdown-item'>
          <Link to='/settings' className='dropdown-button'>
            <span className='dropdown-item-title'>
              Settings
            </span>
          </Link>
        </li>

        <li className='dropdown-item'>
          <Link to='/' className='dropdown-button'>
            <span className='dropdown-item-title'>
              Sign out
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default UserDropdown;
