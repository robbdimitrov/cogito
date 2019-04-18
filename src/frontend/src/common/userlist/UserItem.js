import React from 'react';

import './UserItem.scss';

function UserItem(props) {
  return (
    <li className='user-item container user-card'>
      <div className='cover'></div>

      <div className='content'>
        <div className='header'>
          <img
            className='avatar'
            src='https://via.placeholder.com/300.png'
            alt='John Doe'
          />

          <button className='follow-button outline-button'>
            Follow
          </button>
        </div>

        <div className='texts'>
          <p className='title semibold'>John Smith</p>
          <p className='subtitle light'>@johnsmith</p>

          <p className='bio'>
            A secret agent, Forbes man of the year
          </p>
        </div>
      </div>
    </li>
  );
}

export default UserItem;
