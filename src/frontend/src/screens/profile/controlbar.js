import React from 'react';
import Link from '../../shared/router/link';
import {useRouter} from '../../shared/router/router';

function ControlBar({user}) {
  const router = useRouter();
  const path = `/@${user.username}`;
  const currentPath = router ? router.path : window.location.pathname;

  return (
    <div className="tabs tabs-boxed glass-panel mt-4 justify-around rounded-2xl p-1.5 animate-slide-in">
      <Link href={path} className={`tab flex-1 ${!currentPath.match(/\/(following|followers|likes)$/) ? 'tab-active' : ''}`}>
        Thoughts <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-primary/10 dark:bg-primary/25 text-primary rounded-full font-bold">{user.posts}</span>
      </Link>
      <Link href={`${path}/following`} className={`tab flex-1 ${currentPath.endsWith('/following') ? 'tab-active' : ''}`}>
        Following <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-primary/10 dark:bg-primary/25 text-primary rounded-full font-bold">{user.following}</span>
      </Link>
      <Link href={`${path}/followers`} className={`tab flex-1 ${currentPath.endsWith('/followers') ? 'tab-active' : ''}`}>
        Followers <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-primary/10 dark:bg-primary/25 text-primary rounded-full font-bold">{user.followers}</span>
      </Link>
      <Link href={`${path}/likes`} className={`tab flex-1 ${currentPath.endsWith('/likes') ? 'tab-active' : ''}`}>
        Likes <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-primary/10 dark:bg-primary/25 text-primary rounded-full font-bold">{user.likes}</span>
      </Link>
    </div>
  );
}

export default ControlBar;
