import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ChevronRight, Lock, Monitor, Settings, User} from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';

const menuItems = [
  {title: 'Edit profile', link: 'profile', icon: User},
  {title: 'Change password', link: 'password', icon: Lock},
  {title: 'Sessions', link: 'sessions', icon: Monitor},
];

function SettingsMenu() {
  const pathname = usePathname();

  const isActive = (tabPath) => {
    return pathname.includes(tabPath);
  };

  return (
    <GlassCard as="nav" className="overflow-hidden md:sticky md:top-24" aria-labelledby="settings-nav-heading">
      <div className="card-body p-0">
        <div className="border-b border-base-200/70 px-4 py-3 sm:py-4">
          <h2 id="settings-nav-heading" className="flex min-h-8 items-center gap-3 text-lg font-semibold leading-6">
            <Settings className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            Settings
          </h2>
        </div>
        <ul className="menu gap-1 p-2 sm:gap-1.5 sm:p-3">
          {menuItems.map((item) => {
            const isActive = pathname.endsWith(`/${item.link}`) || (item.link === 'profile' && pathname.endsWith('/settings/profile'));
            const Icon = item.icon;
            return (
              <li key={item.link}>
                <Link
                  href={`/settings/${item.link}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium leading-6 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 sm:min-h-12 sm:px-4 sm:py-3 sm:text-base ${isActive ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/75 hover:bg-base-200/80 hover:text-base-content'}`}
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
    </GlassCard>
  );
}

export default SettingsMenu;
