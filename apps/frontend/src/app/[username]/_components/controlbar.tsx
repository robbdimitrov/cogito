import React from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {glassSurfaceClasses} from '@/shared/components/ui/surface';

function ControlBar({user}) {
  const pathname = usePathname();
  const router = useRouter();
  const path = `/@${user.username}`;

  const isActive = (href) => {
    if (href === path) return !pathname.match(/\/(following|followers|likes)$/);
    return pathname.endsWith(href.split('/').pop());
  };

  const tabs = [
    {
      name: 'Posts',
      count: user.posts,
      href: path,
      isActive: isActive(path),
    },
    {
      name: 'Following',
      count: user.following,
      href: `${path}/following`,
      isActive: pathname.endsWith('/following'),
    },
    {
      name: 'Followers',
      count: user.followers,
      href: `${path}/followers`,
      isActive: pathname.endsWith('/followers'),
    },
    {
      name: 'Likes',
      count: user.likes,
      href: `${path}/likes`,
      isActive: pathname.endsWith('/likes'),
    },
  ];
  const tabHrefs = tabs.map((tab) => tab.href).join('|');

  React.useEffect(() => {
    tabHrefs.split('|').forEach((href) => {
      if (href && href !== pathname) {
        router.prefetch(href);
      }
    });
  }, [pathname, router, tabHrefs]);

  return (
    <div className={`tabs tabs-boxed mt-3 grid grid-cols-4 rounded-2xl p-1 sm:mt-4 sm:p-1.5 ${glassSurfaceClasses}`}>
      {tabs.map((tab) => (
        <Link
          key={tab.name}
          href={tab.href}
          className={`tab group h-10 min-w-0 rounded-xl px-1 text-xs font-medium transition-all duration-300 sm:px-4 sm:text-sm items-center justify-center gap-1 sm:gap-1.5 ${
            tab.isActive
              ? 'tab-active !bg-primary !text-primary-content shadow-sm'
              : '!text-slate-600 dark:!text-slate-300 hover:!text-slate-950 dark:hover:!text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {tab.name}
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all duration-300 sm:ml-1.5 sm:px-2.5 ${
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
