import React, {useState, useEffect, useRef} from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';
import { Sun, Moon, Home, Search, User, Settings, LogOut } from 'lucide-react';

function ThemeToggle() {
  const getInitialTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <button onClick={toggle} className="btn btn-ghost btn-circle" aria-label="Toggle theme">
      {theme === 'light' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

function Navbar({isLoggedIn, user, logoutUser}) {
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

  return (
    <nav className="navbar bg-base-100/70 backdrop-blur-md border-b border-base-200/40 sticky top-0 z-50 transition-shadow duration-300">
      <div className="navbar-start">
        {isLoggedIn && (
          <Link href="/" className="btn btn-ghost normal-case text-xl gap-2 hover:scale-105 transition-transform duration-200">
            <Home className="h-6 w-6" />
            Home
          </Link>
        )}
      </div>

      <div className="navbar-center">
        <span className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">Thoughts</span>
      </div>

      <div className="navbar-end gap-1">
        {isLoggedIn && (
          <Link href="/search" className="btn btn-ghost btn-circle" aria-label="Search">
            <Search className="h-5 w-5" />
          </Link>
        )}
        <ThemeToggle />
        {isLoggedIn ? (
          <div ref={dropdownRef} className="dropdown dropdown-end">
            <button
              onClick={toggleDropdown}
              className="btn btn-ghost btn-circle avatar"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <Avatar name={user?.name} size="md" />
            </button>
            {isDropdownOpen && (
              <ul className="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100/80 backdrop-blur-lg rounded-2xl w-56 border border-base-200/50">
                <li className="menu-title px-3 py-1 text-xs opacity-60">Signed in as @{user?.username || 'user'}</li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}><Link href={`/@${user?.username}`} className="gap-2 py-2"><User className="h-4 w-4" />Profile</Link></li>
                <li onClick={closeDropdown}><Link href="/settings/profile" className="gap-2 py-2"><Settings className="h-4 w-4" />Settings</Link></li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}>
                  <button onClick={logoutUser} className="text-error gap-2 py-2"><LogOut className="h-4 w-4" />Logout</button>
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
