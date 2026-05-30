import React, {useState} from 'react';
import { Pen, Send } from 'lucide-react';

function CreateThought({user, onCreatePost}) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onCreatePost(content.trim())
      .then(() => {
        setContent('');
        setIsSubmitting(false);
      })
      .catch(() => setIsSubmitting(false));
  }

  return (
    <div className="card glass-card rounded-2xl">
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Pen className="absolute top-3 left-3 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
            <textarea
              className="textarea textarea-bordered w-full resize-none pl-10 bg-slate-50/80 dark:bg-slate-900/60 glow-input focus:bg-base-100 dark:focus:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={255}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
              <span className={`text-sm ${content.length > 240 ? 'text-warning' : 'text-slate-500 dark:text-slate-400'}`}>{content.length}/255</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm gap-1 rounded-full px-5"
              disabled={isSubmitting || !content.trim()}
            >
              <Send className="h-4 w-4" />
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateThought;
