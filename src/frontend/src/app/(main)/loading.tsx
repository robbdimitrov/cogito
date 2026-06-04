import { FeedSkeleton } from '@/app/feedskeleton';

export default function Loading() {
  return (
    <main className="container mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-8">
        <aside className="hidden lg:block">
          <div className="card bg-base-100 border border-base-200 animate-pulse">
            <div className="card-body p-5">
              <div className="flex flex-col items-center gap-3">
                <div className="skeleton h-20 w-20 rounded-full" />
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
          </div>
        </aside>
        <section className="w-full max-w-2xl flex flex-col gap-3 sm:gap-4 mx-auto lg:mx-0">
          <FeedSkeleton count={3} />
        </section>
      </div>
    </main>
  );
}
