import ThoughtItem from '@/shared/components/thoughtlist/thoughtitem';
import { MessageSquare } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';

function ThoughtList({posts, users, onLike, onRepost, onDelete, currentUserId, emptyMessage = "No thoughts yet. Share what's on your mind!"}) {
  if (!posts || posts.length === 0) {
    return (
      <GlassCard>
        <div className="card-body items-center text-center text-slate-600 dark:text-slate-300 py-12">
          <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <ThoughtItem
          key={post.rethoughtByUserId ? `${post.id}-rethought-${post.rethoughtByUserId}-${post.rethoughtCreated}` : post.id}
          post={post}
          user={users[0]}
          onLike={onLike}
          onRepost={onRepost}
          onDelete={onDelete || (() => {})}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  );
}

export default ThoughtList;
