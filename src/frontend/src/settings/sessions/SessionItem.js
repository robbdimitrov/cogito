import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './SessionItem.scss';

function SessionItem(props) {
  let icon = props.isDesktop ? 'desktop' : 'mobile-alt';

  return (
    <li className='session-item'>
      <FontAwesomeIcon icon={icon} className='session-device-icon' />

      <div className='session-content'>
        <strong className='session-name'>{props.name}</strong>
        <small className='session-date'>Created on 13.08.2018</small>
      </div>

      <button className='outline-button revoke-button'>
        Revoke
      </button>
    </li>
  );
}

export default SessionItem;
