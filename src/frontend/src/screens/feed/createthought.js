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

  const author = user || {name: '', username: ''};

  return (
    <div className="create-thought">
      <form className="create-thought-form" onSubmit={handleSubmit}>
        <textarea
          className="create-thought-input"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={255}
        />
        <div className="create-thought-actions">
          <span className="create-thought-counter">{content.length}/255</span>
          <button
            type="submit"
            className="button create-thought-button"
            disabled={isSubmitting || !content.trim()}
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateThought;
