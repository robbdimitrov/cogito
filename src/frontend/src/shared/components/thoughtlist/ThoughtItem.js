import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import './ThoughtItem.scss';

function ThoughtItem({ post, user }) {
  return (
    <li className="thought-item">
      <article className="container">


        <p className="profile-action">
          <strong className="name">{user.name}</strong>
          <small className="username">@{user.username}</small>
          <small className="time">3h</small>
        </p>

        <p className="text">{post.content}</p>

        <div className="buttons">
          <button className="retweet-button">
            <FontAwesomeIcon icon="retweet" className="button-icon" />
            <span className="button-label">{post.retweets}</span>
          </button>

          <button className="like-button">
            <FontAwesomeIcon icon="heart" className="button-icon" />
            <span className="button-label">{post.likes}</span>
          </button>
        </div>
      </article>
    </li>
  );
}

export default ThoughtItem;
