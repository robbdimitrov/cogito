import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './UserHeader.scss';

function UserHeader(props) {
  return (
    <div className='user-header container'>
      <div className='cover'></div>

      <div className='content main-content'>
        <img
          className='avatar'
          src='https://via.placeholder.com/300.png'
          alt="Hello"
        />

        <button className='follow-button outline-button'>
          Follow
        </button>

        <div className='texts'>
          <span className='name bold'>John Smith</span>
          <span className='username'>@johnsmith</span>
          <p className='bio'>A secret agent, Forbes man of the year</p>

          <div className='join-date'>
            <FontAwesomeIcon icon='calendar-alt' className='join-date-icon' />
            <span className='join-date-text'>Joined March 2011</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHeader;
