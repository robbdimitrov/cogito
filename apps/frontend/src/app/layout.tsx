import '../index.css';
import Navbar from '@/shared/components/navbar/navbar';
import ToastProvider from '@/shared/components/toast/toast';
import ErrorBoundary from '@/shared/components/errorboundary/errorboundary';
import { getCurrentUser } from '@/shared/services/serverapi';

import { APIProvider } from '@/shared/contexts/apicontext';

export const metadata = {
  title: 'Thoughts',
  description: 'A premium space to share your thoughts.',
};
export const dynamic = 'force-dynamic';
import React from 'react';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased text-slate-800 dark:text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
        <ToastProvider>
          <APIProvider>
            <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute -right-32 -top-32 h-[40rem] w-[40rem] rounded-full bg-fuchsia-400/20 blur-[100px] mix-blend-multiply dark:bg-fuchsia-600/10 dark:mix-blend-lighten opacity-70 animate-pulse-slow"></div>
            <div className="absolute -bottom-40 -left-32 h-[45rem] w-[45rem] rounded-full bg-sky-400/20 blur-[120px] mix-blend-multiply dark:bg-sky-600/10 dark:mix-blend-lighten opacity-70 animate-pulse-slow delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[30rem] w-[30rem] rounded-full bg-indigo-400/10 blur-[100px] mix-blend-multiply dark:bg-indigo-600/10 dark:mix-blend-lighten opacity-50"></div>
          </div>
          <Navbar isLoggedIn={isLoggedIn} user={user} />
          <div className="app-content relative z-0">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
          </APIProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
