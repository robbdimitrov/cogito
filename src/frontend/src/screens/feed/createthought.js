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
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          <textarea
            className="textarea textarea-bordered w-full resize-none"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={255}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-base-content/60">{content.length}/255</span>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || !content.trim()}
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateThought;
