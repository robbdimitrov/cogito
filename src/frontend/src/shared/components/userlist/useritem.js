import React, {useState} from 'react';
import Link from '../../router/link';
import Avatar from '../../components/avatar/avatar';

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
              <p className="text-sm text-base-content/60">@{user.username}</p>
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Following
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Follow
                </>
              )}
            </button>
          )}
        </div>
        {user.bio && <p className="mt-2 text-sm text-base-content/70 line-clamp-2">{user.bio}</p>}
      </div>
    </li>
  );
}

export default UserItem;
