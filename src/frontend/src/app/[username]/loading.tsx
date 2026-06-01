import React from 'react';
import { ProfileSkeleton } from './profileskeleton';

export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
      <ProfileSkeleton />
    </main>
  );
}
