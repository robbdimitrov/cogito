import React, {useState} from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';
import { Check, UserPlus } from 'lucide-react';

function UserItem({user, onFollow, onUnfollow}) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  function handleFollowClick() {
    if (isActionLoading) return;
    setIsActionLoading(true);
    if (user.followed) {
      onUnfollow(user.id).finally(() => setIsActionLoading(false));
    } else {
      onFollow(user.id).finally(() => setIsActionLoading(false));
    }
  }

  return (
    <li className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <Link href={`/@${user.username}`} className="flex items-center gap-3 min-w-0">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
          </Link>
          {onFollow && onUnfollow && (
            <button
              className={`btn btn-sm gap-1 ${user.followed ? 'btn-outline' : 'btn-primary'}`}
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
        </div>
        {user.bio && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{user.bio}</p>}
      </div>
    </li>
  );
}

export default UserItem;
