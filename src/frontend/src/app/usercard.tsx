import React from 'react';
import Link from 'next/link';
import Avatar from '@/shared/components/avatar/avatar';
import GlassCard from '@/shared/components/ui/surface';

function UserCard({user}) {
  return (
    <GlassCard className="sticky top-20 overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-primary/70 to-secondary/70"></div>
      <div className="card-body p-4 -mt-8">
        <Link href={`/@${user.username}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-base-200/50 bg-base-100 p-1 dark:bg-slate-800">
              <Avatar name={user.name} size="lg" />
            </div>
            <div className="min-w-0 pt-6">
              <p className="font-bold truncate">{user.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
            </div>
          </div>
        </Link>

        <div className="flex justify-around mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.posts ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Thoughts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.following ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Following</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg leading-none">{user.followers ?? 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Followers</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default UserCard;
