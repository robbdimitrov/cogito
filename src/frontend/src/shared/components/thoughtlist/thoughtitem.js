import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Link from '../../router/link';
import './thoughtitem.scss';

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin}m`;
  } else if (diffHour < 24) {
    return `${diffHour}h`;
  } else {
    return `${diffDay}d`;
  }
}

function ThoughtItem({post, user, onLike, onRepost}) {
  const author = post.user || user;
  return (
    <li className="thought-item">
      <article className="container">
        <p className="profile-action">
          <Link href={`/@${author.username}`} className="author-link">
            <strong className="name">{author.name}</strong>
            <small className="username">@{author.username}</small>
          </Link>
          <small className="time">{formatRelativeTime(post.created)}</small>
        </p>

        <p className="text">{post.content}</p>

        <div className="buttons">
          <button
            type="button"
            className={post.reposted ? 'retweet-button active' : 'retweet-button'}
            onClick={() => onRepost(post)}>
            <FontAwesomeIcon icon="retweet" className="button-icon" />
            <span className="button-label">{post.reposts}</span>
          </button>

          <button
            type="button"
            className={post.liked ? 'like-button active' : 'like-button'}
            onClick={() => onLike(post)}>
            <FontAwesomeIcon icon="heart" className="button-icon" />
            <span className="button-label">{post.likes}</span>
          </button>
        </div>
      </article>
    </li>
  );
}

export default ThoughtItem;
