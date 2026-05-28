import React from 'react';

function PostSkeleton() {
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

function UserSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-200 animate-pulse">
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton({count = 3}) {
  return (
    <div className="space-y-3">
      {Array.from({length: count}).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-base-200 animate-pulse overflow-hidden">
        <div className="h-24 bg-base-200" />
        <div className="card-body px-6 pb-6 -mt-10">
          <div className="flex justify-between items-end">
            <div className="skeleton h-20 w-20 rounded-full" />
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

export {PostSkeleton, UserSkeleton, FeedSkeleton, ProfileSkeleton};
