import React from 'react';
import Link from '../../../shared/router/link';
import {useRouter} from '../../../shared/router/router';
import {ChevronRight, Lock, Monitor, Settings, User} from 'lucide-react';

const menuItems = [
  {title: 'Edit profile', link: 'profile', icon: User},
  {title: 'Change password', link: 'password', icon: Lock},
  {title: 'Sessions', link: 'sessions', icon: Monitor},
];

function SettingsMenu() {
  const router = useRouter();
  const currentPath = router ? router.path : window.location.pathname;

  return (
    <nav className="card glass-card rounded-2xl overflow-hidden animate-slide-in xl:sticky xl:top-24" aria-labelledby="settings-nav-heading">
      <div className="card-body p-0">
        <div className="border-b border-base-200/70 px-4 py-4">
          <h2 id="settings-nav-heading" className="flex min-h-8 items-center gap-3 text-lg font-semibold leading-6">
            <Settings className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            Settings
          </h2>
        </div>
        <ul className="menu gap-1.5 p-3">
          {menuItems.map((item) => {
            const isActive = currentPath.endsWith(`/${item.link}`) || (item.link === 'profile' && currentPath.endsWith('/settings/profile'));
            const Icon = item.icon;
            return (
              <li key={item.link}>
                <Link
                  href={`/settings/${item.link}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-base font-medium leading-6 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 ${isActive ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/75 hover:bg-base-200/80 hover:text-base-content'}`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <ChevronRight className={`ml-auto h-4 w-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60'}`} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default SettingsMenu;
