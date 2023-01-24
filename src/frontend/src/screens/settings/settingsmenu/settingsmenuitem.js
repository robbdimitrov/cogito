import React from 'react';

import Link from '../../../shared/router/link';
import './settingsmenuitem.scss';

function SettingsMenuItem(props) {
  return (
    <li className='settings-menu-item'>
      <Link href={`/settings/${props.link}`} className='settings-menu-button'>
        <span className='settings-menu-item-title'>
          {props.title}
        </span>
      </Link>
    </li>
  );
}

export default SettingsMenuItem;
