import React from 'react';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';

export default function SettingsPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-base-content dark:text-slate-400 dark:hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 rounded-md">
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      </div>
      {children}
    </main>
  );
}
