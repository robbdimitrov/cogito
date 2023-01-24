import React from 'react';

import Link from '../../shared/router/link';
import './controlbar.scss';

function ControlBar(props) {
  const path = `/@${props.user.username}`

  return (
    <div className="control-bar-container bottom-shadow">
      <div className="control-bar main-content">
        <nav className="counters">
          <Link href={path} className="counter thoughts">
            <span className="counter-label">Thoughts</span>
            <span className="counter-value">{props.user.posts}</span>
          </Link>

          <Link href={`${path}/following`} className="counter following">
            <span className="counter-label">Following</span>
            <span className="counter-value">{props.user.following}</span>
          </Link>

          <Link href={`${path}/followers`} className="counter followers">
            <span className="counter-label">Followers</span>
            <span className="counter-value">{props.user.followers}</span>
          </Link>

          <Link href={`${path}/likes`} className="counter likes">
            <span className="counter-label">Likes</span>
            <span className="counter-value">{props.user.likes}</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default ControlBar;
