import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

import './ThoughtItem.scss';

function ThoughtItem({ post, user, context }) {
  return (
    <li className="thought-item">
      <article className="container">
        {context &&
          <div className="context">
            <FontAwesomeIcon icon="retweet" className="context-icon" />
            <span className="context-label">
              {context.user.name} {context.action}
            </span>
          </div>
        }

        <div className="wrapper">
          <img
            className="avatar"
            src={user.avatar}
            alt={user.name}
          />

          <div className="content">
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
          </div>
        </div>
      </article>
    </li>
  );
}

ThoughtItem.propTypes = {
  post: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  context: PropTypes.object
};

export default ThoughtItem;
