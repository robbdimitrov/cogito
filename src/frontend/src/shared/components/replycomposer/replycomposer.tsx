'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import Avatar from '@/shared/components/avatar/avatar';
import { User, Post } from '@/shared/types';

interface ReplyComposerProps {
  currentUser: User;
  replyToPost: Post;
  onReply: (content: string) => Promise<void>;
}

function ReplyComposer({ currentUser, replyToPost, onReply }: ReplyComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onReply(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="shrink-0">
        <Avatar name={currentUser?.name} size="sm" photoKey={currentUser?.profilePhotoKey} />
      </div>
      <div className="flex-1 min-w-0">
        <textarea
          className="textarea textarea-bordered w-full resize-none text-sm leading-relaxed"
          placeholder={`Reply to @${replyToPost.user?.username ?? 'this post'}…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={255}
          rows={2}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-sm btn-square shrink-0 mt-1"
        disabled={isSubmitting || !content.trim()}
        aria-label="Send reply"
      >
        {isSubmitting ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}

export default ReplyComposer;
