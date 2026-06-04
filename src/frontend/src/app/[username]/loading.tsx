import { FeedSkeleton } from '@/app/feedskeleton';

export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="card overflow-hidden border border-base-200 bg-base-100 animate-pulse">
          <div className="h-24 bg-base-200 sm:h-32" />
          <div className="card-body -mt-11 px-4 pb-4 sm:-mt-14 sm:px-6 sm:pb-6">
            <div className="flex items-end justify-between">
              <div className="skeleton h-16 w-16 rounded-full" />
              <div className="skeleton h-8 w-28 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-4 w-full" />
            </div>
          </div>
        </div>
        <div className="skeleton h-12 w-full rounded-2xl" />
        <FeedSkeleton count={2} />
      </div>
    </main>
  );
}
