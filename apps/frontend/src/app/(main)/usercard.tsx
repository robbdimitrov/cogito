import { getSafeUploadUrl } from '@/shared/utils/url';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import GlassCard from '@/shared/components/ui/surface';

function ProfileStats({user, compact = false}) {
  const statClass = compact ? 'text-sm leading-none' : 'text-lg leading-none';

  return (
    <div className={`flex ${compact ? 'gap-4' : 'justify-around mt-4 pt-4 border-t border-slate-200 dark:border-slate-700'}`}>
      <div className={compact ? '' : 'text-center'}>
        <p className={`font-bold ${statClass}`}>{user.posts ?? 0}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Thoughts</p>
      </div>
      <div className={compact ? '' : 'text-center'}>
        <p className={`font-bold ${statClass}`}>{user.following ?? 0}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Following</p>
      </div>
      <div className={compact ? '' : 'text-center'}>
        <p className={`font-bold ${statClass}`}>{user.followers ?? 0}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Followers</p>
      </div>
    </div>
  );
}

function UserCard({user, variant = 'sidebar'}) {
  if (variant === 'compact') {
    return (
      <GlassCard className="overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <Link href={`/@${user.username}`} className="shrink-0">
            <Avatar name={user.name} size="md" photoKey={user.profilePhotoKey} />
          </Link>
          <Link href={`/@${user.username}`} className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Your profile</p>
            <p className="font-bold truncate leading-tight">{user.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
          </Link>
          <Link href={`/@${user.username}`} className="btn btn-primary btn-xs rounded-full px-3">
            View
          </Link>
        </div>
        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
          <ProfileStats user={user} compact />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="sticky top-20 overflow-hidden">
      <div className="h-16 relative bg-gradient-to-r from-primary/70 to-secondary/70">
        {user.coverPhotoKey && (
          <img src={getSafeUploadUrl(user.coverPhotoKey)} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      <div className="card-body p-4 -mt-8 relative z-10">
        <Link href={`/@${user.username}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-base-200/50 bg-base-100 p-1 dark:bg-slate-800">
              <Avatar name={user.name} size="lg" photoKey={user.profilePhotoKey} />
            </div>
            <div className="min-w-0 pt-6">
              <p className="font-bold truncate">{user.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
          </div>
        </Link>

        <ProfileStats user={user} />
      </div>
    </GlassCard>
  );
}

export default UserCard;
