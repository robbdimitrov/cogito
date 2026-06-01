import {useEffect, useState} from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const storageKey = 'theme';
const themeChangeEvent = 'thoughts-theme-change';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(storageKey);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  const resolvedTheme = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    const initialTheme = getStoredTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getStoredTheme() === 'system') {
        setThemeState('system');
        applyTheme('system');
      }
    };
    const handleThemeChange = () => {
      const nextTheme = getStoredTheme();
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    };

    media.addEventListener('change', handleChange);
    window.addEventListener(themeChangeEvent, handleThemeChange);
    return () => {
      media.removeEventListener('change', handleChange);
      window.removeEventListener(themeChangeEvent, handleThemeChange);
    };
  }, []);

  const setTheme = (mode: ThemeMode) => {
    if (mode === 'system') {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, mode);
    }
    setThemeState(mode);
    applyTheme(mode);
    window.dispatchEvent(new Event(themeChangeEvent));
  };

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  return {theme, resolvedTheme, setTheme};
}
