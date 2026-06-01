import React from 'react';
import { FeedSkeleton } from '@/app/feedskeleton';

export function ProfileSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="card bg-base-100 border border-base-200 animate-pulse overflow-hidden">
        <div className="h-24 bg-base-200" />
        <div className="card-body -mt-10 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex justify-between items-end">
            <div className="skeleton h-14 w-14 rounded-full" />
            <div className="skeleton h-8 w-24" />
          </div>
          <div className="space-y-2 mt-3">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-full" />
          </div>
        </div>
      </div>
      <div className="skeleton h-10 w-full" />
      <FeedSkeleton count={2} />
    </div>
  );
}
