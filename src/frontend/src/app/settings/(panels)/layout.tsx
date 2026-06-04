import React from 'react';
import SettingsMenu from '@/app/settings/_components/settingsmenu';

export default function SettingsPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[minmax(17rem,30%)_minmax(0,1fr)] md:gap-6 lg:gap-8">
        <div className="min-w-0">
          <SettingsMenu />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
