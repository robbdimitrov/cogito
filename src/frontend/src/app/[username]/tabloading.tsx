import React from 'react';
import { FeedSkeleton } from '@/app/feedskeleton';
import GlassCard from '@/shared/components/ui/surface';

export function UserListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <GlassCard as="li" key={index} className="animate-pulse">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
              <div className="skeleton h-8 w-24 rounded-full" />
            </div>
          </div>
        </GlassCard>
      ))}
    </ul>
  );
}

export function ThoughtTabSkeleton() {
  return <FeedSkeleton count={2} />;
}
