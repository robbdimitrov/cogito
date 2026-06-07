'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import { Sun, Moon, Home, User as UserIcon, Settings, LogOut } from 'lucide-react';
import { useAPI } from '@/shared/contexts/apicontext';
import { useTheme } from '@/shared/hooks/usetheme';

function ThemeToggle() {
  const {resolvedTheme, setTheme} = useTheme();
  const toggle = () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light');

  return (
    <button onClick={toggle} className="btn btn-ghost btn-circle hover:bg-white/40 dark:hover:bg-white/10" aria-label="Toggle theme">
      {resolvedTheme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
import type { User } from '@/shared/types';

interface NavbarProps {
  isLoggedIn: boolean;
  user?: User | null;
}

function Navbar({isLoggedIn, user}: NavbarProps) {
  const apiClient = useAPI();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsDropdownOpen((v) => !v);
  const closeDropdown = () => setIsDropdownOpen(false);

  const handleLogout = () => {
    apiClient.logout().finally(() => {
      window.location.href = '/login';
    });
  };

  return (
    <nav className="navbar sticky top-0 z-50 min-h-16 border-b border-white/40 bg-white/35 px-3 shadow-none backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/35 sm:px-4 supports-[backdrop-filter]:bg-white/25 dark:supports-[backdrop-filter]:bg-slate-950/25">
      <div className="navbar-start">
        {isLoggedIn && (
          <Link href="/" className="btn btn-ghost normal-case text-base sm:text-lg gap-2 hover:scale-105 hover:bg-white/40 dark:hover:bg-white/10 transition-transform duration-200">
            <Home className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="hidden xs:inline sm:inline">Home</span>
          </Link>
        )}
      </div>

      <div className="navbar-center">
        <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-primary via-fuchsia-500 to-secondary bg-clip-text text-transparent tracking-tight drop-shadow-sm">Thoughts</span>
      </div>

      <div className="navbar-end gap-1">
        <ThemeToggle />
        {isLoggedIn ? (
          <div ref={dropdownRef} className="dropdown dropdown-end">
            <button
              onClick={toggleDropdown}
              className="btn btn-ghost btn-circle avatar hover:bg-white/40 dark:hover:bg-white/10"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <Avatar name={user?.name} size="md" photoKey={user?.profilePhotoKey} />
            </button>
            {isDropdownOpen && (
              <ul className="menu menu-sm dropdown-content z-[1001] mt-3 w-56 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50">
                <li className="menu-title px-3 py-1 text-xs opacity-60">Signed in as @{user?.username || 'user'}</li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}><Link href={`/@${user?.username}`} className="gap-2 py-2"><UserIcon className="h-4 w-4" />Profile</Link></li>
                <li onClick={closeDropdown}><Link href="/settings" className="gap-2 py-2"><Settings className="h-4 w-4" />Settings</Link></li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}>
                  <button onClick={handleLogout} className="text-error gap-2 py-2"><LogOut className="h-4 w-4" />Logout</button>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm rounded-full px-6">Log In</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
