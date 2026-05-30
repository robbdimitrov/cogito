import React, {useState} from 'react';
import Avatar from '../../shared/components/avatar/avatar';
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
    <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
      <div className="card-body p-4 sm:p-5">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 sm:gap-4">
            <div className="hidden sm:block shrink-0">
              <Avatar name={user?.name} size="md" />
            </div>
            <div className="relative flex-1 min-w-0">
              <Pen className="absolute top-3 left-3 h-5 w-5 text-slate-500 dark:text-slate-400 pointer-events-none" />
              <textarea
                className="textarea textarea-bordered w-full resize-none rounded-2xl border-slate-200/70 bg-white/55 pl-10 shadow-inner shadow-slate-900/5 transition-all duration-300 focus:border-primary/60 focus:bg-white/80 focus:ring-4 focus:ring-primary/10 dark:border-slate-700/70 dark:bg-slate-950/35 dark:focus:bg-slate-950/60"
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={255}
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-3 sm:pl-14">
            <span className={`text-sm ${content.length > 240 ? 'text-warning' : 'text-slate-500 dark:text-slate-400'}`}>{content.length}/255</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm gap-1 rounded-full px-5 shadow-lg shadow-primary/20"
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
