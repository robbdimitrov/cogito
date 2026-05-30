import React from 'react';
import Link from '../../shared/router/link';
import Avatar from '../../shared/components/avatar/avatar';
import { Pen, Check, UserPlus, Calendar } from 'lucide-react';
import GlassCard from '../../shared/components/ui/surface';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
}

function UserHeader({user, currentUser, onFollow, onUnfollow}) {
  const isOwnProfile = currentUser && currentUser.id === user.id;

  function handleFollowClick() {
    if (user.followed) {
      onUnfollow(user.id);
    } else {
      onFollow(user.id);
    }
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="h-32 bg-gradient-to-tr from-primary via-primary/80 to-secondary relative">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
      </div>
      <div className="card-body px-6 pb-6 -mt-14 relative">
        <div className="flex justify-between items-end">
          <div className="relative rounded-full border border-base-200/50 bg-base-100 p-1 dark:bg-slate-800">
            <Avatar name={user.name} size="xl" />
          </div>
          {isOwnProfile ? (
            <Link href="/settings/profile" className="btn btn-outline btn-sm gap-1 rounded-full px-4">
              <Pen className="h-4 w-4" />
              Edit Profile
            </Link>
          ) : (
            <button
              className={`btn btn-sm gap-1 rounded-full px-4 ${user.followed ? 'btn-outline' : 'btn-primary'}`}
              onClick={handleFollowClick}
            >
              {user.followed ? (
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
        <div className="mt-4">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">@{user.username}</p>
          {user.bio && <p className="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{user.bio}</p>}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(user.created)}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default UserHeader;
