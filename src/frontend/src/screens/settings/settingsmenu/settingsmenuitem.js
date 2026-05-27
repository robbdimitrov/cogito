import React from 'react';
import Link from '../../../shared/router/link';

function SettingsMenuItem(props) {
  const isActive = window.location.pathname.endsWith(props.link);
  return (
    <li>
      <Link href={`/settings/${props.link}`} className={isActive ? 'active' : ''}>
        {props.title}
      </Link>
    </li>
  );
}

export default SettingsMenuItem;
