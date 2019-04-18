import React from 'react';
import { NavLink } from 'react-router-dom';

import './SettingsMenu.scss';

function SettingsMenu(props) {
  return (
    <div className='settings-menu'>
      <ul className='settings-menu-list'>
        <li className='settings-menu-item header'>
          <span className='settings-menu-item-title'>
            Settings
          </span>
        </li>

        <li className='settings-menu-item'>
          <NavLink to='/settings/account' className='settings-menu-button'>
            <span className='settings-menu-item-title'>
              Edit profile
            </span>
          </NavLink>
        </li>

        <li className='settings-menu-item'>
          <NavLink to='/settings/password' className='settings-menu-button'>
            <span className='settings-menu-item-title'>
              Change password
            </span>
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default SettingsMenu;
