import React from 'react';

import './UserCard.scss';

function UserCard(props) {
  return (
    <div className='user-card container'>
      <div className='cover'></div>

      <div className='content'>
        <img
          className='avatar'
          src='https://via.placeholder.com/300.png'
          alt='John Smith'
        />

        <div className='texts'>
          <p className='title semibold'>John Smith</p>
          <p className='subtitle light'>@johnsmith</p>
        </div>
      </div>

      <div className='counters'>
        <div className='counter'>
          <span className='counter-label light'>Thoughts</span>
          <span className='counter-value'>2</span>
        </div>

        <div className='counter'>
          <span className='counter-label light'>Following</span>
          <span className='counter-value'>70</span>
        </div>

        <div className='counter'>
          <span className='counter-label light'>Followers</span>
          <span className='counter-value'>160</span>
        </div>
      </div>
    </div>
  );
}

export default UserCard;
