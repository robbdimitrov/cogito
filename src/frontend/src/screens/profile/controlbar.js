import React from 'react';
import Link from '../../shared/router/link';

function ControlBar({user}) {
  const path = `/@${user.username}`;

  return (
    <div className="tabs tabs-boxed bg-base-100 shadow-sm border border-base-200 mt-4 justify-around">
      <Link href={path} className={`tab flex-1 ${!window.location.pathname.match(/\/(following|followers|likes)$/) ? 'tab-active' : ''}`}>
        Thoughts <span className="ml-1 opacity-60">{user.posts}</span>
      </Link>
      <Link href={`${path}/following`} className={`tab flex-1 ${window.location.pathname.endsWith('/following') ? 'tab-active' : ''}`}>
        Following <span className="ml-1 opacity-60">{user.following}</span>
      </Link>
      <Link href={`${path}/followers`} className={`tab flex-1 ${window.location.pathname.endsWith('/followers') ? 'tab-active' : ''}`}>
        Followers <span className="ml-1 opacity-60">{user.followers}</span>
      </Link>
      <Link href={`${path}/likes`} className={`tab flex-1 ${window.location.pathname.endsWith('/likes') ? 'tab-active' : ''}`}>
        Likes <span className="ml-1 opacity-60">{user.likes}</span>
      </Link>
    </div>
  );
}

export default ControlBar;
