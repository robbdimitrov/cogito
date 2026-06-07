import GlassCard from '@/shared/components/ui/surface';

export default function Loading() {
  return (
    <GlassCard className="animate-pulse">
      <div className="card-body gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-40" />
      </div>
    </GlassCard>
  );
}
