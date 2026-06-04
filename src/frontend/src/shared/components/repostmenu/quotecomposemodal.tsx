'use client';

import { useState } from 'react';
import { Post } from '@/shared/types';
import QuoteEmbed from '@/shared/components/thoughtlist/quoteembed';

interface QuoteComposeModalProps {
  quotedPost: Post;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

function QuoteComposeModal({ quotedPost, onClose, onSubmit }: QuoteComposeModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    if (!isSubmitting) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-3">Rethought</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            className="textarea textarea-bordered w-full resize-none text-base leading-relaxed"
            placeholder="Add a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={255}
            rows={3}
            autoFocus
          />
          <div className={`text-right text-sm mt-1 ${content.length > 240 ? 'text-warning' : 'text-slate-500 dark:text-slate-400'}`}>
            {content.length}/255
          </div>
          <QuoteEmbed post={quotedPost} />
          <div className="modal-action mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : null}
              Rethought
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleClose} />
    </dialog>
  );
}

export default QuoteComposeModal;
