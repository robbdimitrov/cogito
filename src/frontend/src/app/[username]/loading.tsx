import React from 'react';
import { ProfileSkeleton } from './profileskeleton';

export default function Loading() {
  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
      <ProfileSkeleton />
    </main>
  );
}
