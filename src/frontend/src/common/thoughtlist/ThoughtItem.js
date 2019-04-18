import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './ThoughtItem.scss';

function ThoughtItem(props) {
  return (
    <li className='thought-item'>
      <article className='container'>
        <div className='context'>
          <FontAwesomeIcon icon='retweet' className='context-icon' />
          <span className='context-label'>Jonathan Key retweeted</span>
        </div>

        <div className='wrapper'>
          <img
            className='avatar'
            src='https://via.placeholder.com/300.png'
            alt='John Doe'
          />

          <div className='content'>
            <p className='profile-action'>
              <strong className='name'>John Doe</strong>
              <small className='username'>@johndoe</small>
              <small className='time'>3h</small>
            </p>

            <p className='text'>Hello beautiful world! My first post!</p>

            <div className='buttons'>
              <button className='retweet-button'>
                <FontAwesomeIcon icon='retweet' className='button-icon' />
                <span className='button-label'>2</span>
              </button>

              <button className='like-button'>
                <FontAwesomeIcon icon='heart' className='button-icon' />
                <span className='button-label'>3</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export default ThoughtItem;
