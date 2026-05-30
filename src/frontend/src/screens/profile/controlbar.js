import React from 'react';
import Link from '../../shared/router/link';
import {useRouter} from '../../shared/router/router';

function ControlBar({user}) {
  const router = useRouter();
  const path = `/@${user.username}`;
  const currentPath = router ? router.path : window.location.pathname;

  return (
    <div className="tabs tabs-boxed bg-base-100/40 backdrop-blur-lg border border-base-200/50 mt-4 justify-around rounded-2xl p-1.5 animate-slide-in">
      <Link href={path} className={`tab flex-1 ${!currentPath.match(/\/(following|followers|likes)$/) ? 'tab-active' : ''}`}>
        Thoughts <span className="ml-1 opacity-60">{user.posts}</span>
      </Link>
      <Link href={`${path}/following`} className={`tab flex-1 ${currentPath.endsWith('/following') ? 'tab-active' : ''}`}>
        Following <span className="ml-1 opacity-60">{user.following}</span>
      </Link>
      <Link href={`${path}/followers`} className={`tab flex-1 ${currentPath.endsWith('/followers') ? 'tab-active' : ''}`}>
        Followers <span className="ml-1 opacity-60">{user.followers}</span>
      </Link>
      <Link href={`${path}/likes`} className={`tab flex-1 ${currentPath.endsWith('/likes') ? 'tab-active' : ''}`}>
        Likes <span className="ml-1 opacity-60">{user.likes}</span>
      </Link>
    </div>
  );
}

export default ControlBar;
