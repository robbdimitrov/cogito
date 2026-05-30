import React from 'react';

export function PostSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-200 animate-pulse">
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-4 w-8" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
            <div className="flex gap-6">
              <div className="skeleton h-6 w-12" />
              <div className="skeleton h-6 w-12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
