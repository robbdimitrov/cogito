import React from 'react';

import './SettingsMenuHeader.scss'

function SettingsMenuHeader(props) {
  return (
    <li className="settings-menu-item header">
      <span className="settings-menu-item-title">
        {props.title}
      </span>
    </li>
  );
}

export default SettingsMenuHeader;
