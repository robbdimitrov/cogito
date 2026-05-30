import React from 'react';
import Link from '../../router/link';
import {useRouter} from '../../router/router';
import { Home, Search, User, Settings } from 'lucide-react';

function BottomNav({user}) {
  const router = useRouter();
  const currentPath = router ? router.path : window.location.pathname;

  const isActive = (path) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100/95 backdrop-blur-lg border-t border-base-200 z-50">
      <div className="flex justify-around items-center h-16">
        <Link href="/" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/') ? 'text-primary' : 'text-base-content/40'}`}>
          <Home className="h-6 w-6" strokeWidth={isActive('/') ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/search" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/search') ? 'text-primary' : 'text-base-content/40'}`}>
          <Search className="h-6 w-6" strokeWidth={isActive('/search') ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Search</span>
        </Link>
        <Link href={`/@${user?.username}`} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/@') ? 'text-primary' : 'text-base-content/40'}`}>
          <User className="h-6 w-6" strokeWidth={isActive('/@') ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        <Link href="/settings/profile" className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive('/settings') ? 'text-primary' : 'text-base-content/40'}`}>
          <Settings className="h-6 w-6" strokeWidth={isActive('/settings') ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNav;
