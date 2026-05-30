import React from 'react';
import Link from '../../../shared/router/link';
import {useRouter} from '../../../shared/router/router';
import { User, Lock, Monitor, Settings } from 'lucide-react';

const menuItems = [
  {title: 'Edit profile', link: 'profile', icon: <User className="h-4 w-4" />},
  {title: 'Change password', link: 'password', icon: <Lock className="h-4 w-4" />},
  {title: 'Sessions', link: 'sessions', icon: <Monitor className="h-4 w-4" />},
];

function SettingsMenu() {
  const router = useRouter();
  const currentPath = router ? router.path : window.location.pathname;

  return (
    <div className="card glass-card rounded-2xl overflow-hidden animate-slide-in">
      <div className="card-body p-0">
        <div className="px-4 py-3 border-b border-base-200">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </h3>
        </div>
        <ul className="menu menu-sm">
          {menuItems.map((item) => {
            const isActive = currentPath.endsWith(`/${item.link}`) || (item.link === 'profile' && currentPath.endsWith('/settings/profile'));
            return (
              <li key={item.link}>
                <Link href={`/settings/${item.link}`} className={`gap-3 ${isActive ? 'active' : ''}`}>
                  {item.icon}
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default SettingsMenu;
