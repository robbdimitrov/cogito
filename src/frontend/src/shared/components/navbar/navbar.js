import React, {useState, useEffect, useRef} from 'react';
import Link from '../../router/link';

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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
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
    <nav className="navbar bg-base-100/80 backdrop-blur-lg border-b border-base-200/60 sticky top-0 z-50 transition-shadow duration-300">
      <div className="navbar-start">
        {isLoggedIn && (
          <Link href="/" className="btn btn-ghost normal-case text-xl gap-2 hover:scale-105 transition-transform duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Home
          </Link>
        )}
      </div>

      <div className="navbar-center">
        <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Thoughts</span>
      </div>

      <div className="navbar-end gap-2">
        <ThemeToggle />
        {isLoggedIn ? (
          <div ref={dropdownRef} className="dropdown dropdown-end">
            <button
              onClick={toggleDropdown}
              className="btn btn-ghost btn-circle avatar"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center text-lg font-bold ring-2 ring-base-300/50 ring-offset-2 ring-offset-base-100">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </button>
            {isDropdownOpen && (
              <ul className="mt-3 z-[1] p-2 shadow-xl shadow-base-content/10 menu menu-sm dropdown-content bg-base-100 rounded-box w-56 border border-base-200/80 backdrop-blur-sm">
                <li className="menu-title px-3 py-1 text-xs opacity-60">Signed in as @{user?.username || 'user'}</li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}><Link href={`/@${user?.username}`} className="gap-2 py-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>Profile</Link></li>
                <li onClick={closeDropdown}><Link href="/settings/profile" className="gap-2 py-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Settings</Link></li>
                <div className="divider my-1 mx-2 h-px bg-base-200"></div>
                <li onClick={closeDropdown}>
                  <button onClick={logoutUser} className="text-error gap-2 py-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Logout</button>
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
