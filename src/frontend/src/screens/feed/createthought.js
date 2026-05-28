import React, {useState} from 'react';

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
    <div className="card bg-base-100/90 backdrop-blur-sm border border-base-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-3 left-3 h-5 w-5 text-base-content/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            <textarea
              className="textarea textarea-bordered w-full resize-none pl-10 bg-base-100/50 focus:bg-base-100 transition-colors"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={255}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className={`text-sm transition-colors ${content.length > 240 ? 'text-warning' : 'text-base-content/50'}`}>{content.length}/255</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm gap-1 rounded-full px-5 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
              disabled={isSubmitting || !content.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateThought;
