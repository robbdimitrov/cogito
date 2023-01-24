import React from 'react';
import {NavLink} from 'react-router-dom';

import './settingsmenuitem.scss';

function SettingsMenuItem(props) {
  return (
    <li className='settings-menu-item'>
      <NavLink to={`/settings/${props.link}`} className='settings-menu-button'>
        <span className='settings-menu-item-title'>
          {props.title}
        </span>
      </NavLink>
    </li>
  );
}

export default SettingsMenuItem;
