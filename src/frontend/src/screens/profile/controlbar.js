import React from 'react';
import Link from '../../shared/router/link';
import {useRouter} from '../../shared/router/router';

function ControlBar({user}) {
  const router = useRouter();
  const path = `/@${user.username}`;
  const currentPath = router ? router.path : window.location.pathname;

  const tabs = [
    {
      name: 'Thoughts',
      count: user.posts,
      href: path,
      isActive: !currentPath.match(/\/(following|followers|likes)$/),
    },
    {
      name: 'Following',
      count: user.following,
      href: `${path}/following`,
      isActive: currentPath.endsWith('/following'),
    },
    {
      name: 'Followers',
      count: user.followers,
      href: `${path}/followers`,
      isActive: currentPath.endsWith('/followers'),
    },
    {
      name: 'Likes',
      count: user.likes,
      href: `${path}/likes`,
      isActive: currentPath.endsWith('/likes'),
    },
  ];

  return (
    <div className="tabs tabs-boxed glass-panel mt-4 justify-around rounded-2xl p-1.5 animate-slide-in">
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={`tab flex-1 group transition-all duration-300 rounded-xl h-10 px-4 text-sm font-medium items-center justify-center gap-1.5 ${
            tab.isActive
              ? 'tab-active !bg-primary !text-primary-content shadow-sm'
              : '!text-slate-600 dark:!text-slate-300 hover:!text-slate-950 dark:hover:!text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {tab.name}
          <span
            className={`ml-1.5 px-2.5 py-0.5 text-[10px] rounded-full font-bold transition-all duration-300 ${
              tab.isActive
                ? 'bg-primary-content/25 text-primary-content'
                : 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-violet-300 group-hover:bg-primary/20 dark:group-hover:bg-primary/30'
            }`}
          >
            {tab.count}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default ControlBar;
