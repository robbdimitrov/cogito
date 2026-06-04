'use client';

import React from 'react';
import Link from 'next/link';
import {ChevronRight, Lock, Monitor, Moon, Sun, User, Laptop} from 'lucide-react';
import GlassCard, {cx} from '@/shared/components/ui/surface';
import {ThemeMode, useTheme} from '@/shared/hooks/usetheme';

const themeOptions: {label: string; value: ThemeMode; icon: React.ElementType}[] = [
  {label: 'System', value: 'system', icon: Laptop},
  {label: 'Light', value: 'light', icon: Sun},
  {label: 'Dark', value: 'dark', icon: Moon},
];

const settingsLinks = [
  {title: 'Edit profile', description: 'Update your name, username, email, and bio.', href: '/settings/profile', icon: User},
  {title: 'Change password', description: 'Keep your account password fresh and secure.', href: '/settings/password', icon: Lock},
  {title: 'Sessions', description: 'Review and manage active browser sessions.', href: '/settings/sessions', icon: Monitor},
];

function SettingsHome() {
  const {theme, setTheme} = useTheme();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 sm:space-y-4">
      <header className="px-1 pb-1 sm:pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Manage your account, appearance, and security.
        </p>
      </header>

      <GlassCard>
        <div className="card-body gap-4 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold">Appearance</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose how Thoughts looks on this device.</p>
          </div>
          <div className="grid grid-cols-3 rounded-2xl bg-base-200/70 p-1 dark:bg-slate-950/60" role="radiogroup" aria-label="Theme">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={cx(
                    'btn btn-ghost min-h-11 rounded-xl border-0 px-2 text-xs font-semibold sm:text-sm',
                    isActive
                      ? 'bg-base-100 text-base-content shadow-sm hover:bg-base-100 dark:bg-slate-800 dark:hover:bg-slate-800'
                      : 'text-base-content/60 hover:bg-base-100/60 hover:text-base-content dark:hover:bg-white/5'
                  )}
                  onClick={() => setTheme(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <div className="space-y-2 sm:space-y-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block outline-none">
              <GlassCard interactive className="overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-base-100">
                <div className="flex items-center gap-3 p-4 sm:p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-violet-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold leading-tight">{item.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default SettingsHome;
