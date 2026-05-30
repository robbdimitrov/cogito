import React, {useState} from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';
import { Check, UserPlus } from 'lucide-react';

function UserItem({user, onFollow, onUnfollow, currentUserId}) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const isCurrentUser = currentUserId && user.id === currentUserId;

  function handleFollowClick() {
    if (isActionLoading) return;
    setIsActionLoading(true);
    const action = user.followed ? onUnfollow : onFollow;
    Promise.resolve(action(user.id)).finally(() => setIsActionLoading(false));
  }

  return (
    <li className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.005] hover:shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
      <div className="card-body p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/@${user.username}`} className="flex items-center gap-3 min-w-0 group">
            <div className="shrink-0 rounded-full p-1 bg-white/45 dark:bg-white/5 ring-1 ring-white/60 dark:ring-white/10 transition-transform duration-200 group-hover:scale-105">
              <Avatar name={user.name} size="md" />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="font-semibold truncate text-base-content group-hover:underline">{user.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
          </Link>
          {onFollow && onUnfollow && !isCurrentUser && (
            <button
              type="button"
              className={`btn btn-sm gap-1 rounded-full px-4 shrink-0 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
                user.followed
                  ? 'btn-outline bg-white/25 dark:bg-white/5 border-white/50 dark:border-white/10'
                  : 'btn-primary shadow-primary/20'
              }`}
              onClick={handleFollowClick}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : user.followed ? (
                <>
                  <Check className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </button>
          )}
          {isCurrentUser && (
            <span className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/35 dark:bg-white/5 border border-white/50 dark:border-white/10">
              You
            </span>
          )}
        </div>
        {user.bio && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed sm:pl-14">{user.bio}</p>}
      </div>
    </li>
  );
}

export default UserItem;
