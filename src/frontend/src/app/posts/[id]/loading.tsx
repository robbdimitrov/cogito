import React from 'react';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="card bg-base-100 border border-base-200 animate-pulse">
        <div className="card-body p-6 space-y-4">
          <div className="flex gap-3">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-24" />
            </div>
          </div>
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="flex gap-6">
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
