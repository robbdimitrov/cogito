import ThoughtItem from '@/shared/components/thoughtlist/thoughtitem';
import { MessageSquare } from 'lucide-react';
import GlassCard from '@/shared/components/ui/surface';
import type { Post, User } from '@/shared/types';

interface ThoughtListProps {
  posts: Post[];
  users: User[];
  onLike: (post: Post) => Promise<void>;
  onRepost: (post: Post) => Promise<void>;
  onDelete: (id: string) => void;
  currentUserId: string | null | undefined;
  onQuote?: (post: Post) => void;
  emptyMessage?: string;
}

function ThoughtList({posts, users, onLike, onRepost, onDelete, currentUserId, onQuote, emptyMessage = "No thoughts yet. Share what's on your mind!"}: ThoughtListProps) {
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
          onQuote={onQuote}
        />
      ))}
    </ul>
  );
}

export default ThoughtList;
