import React from 'react';
import UserCard from './usercard';
import CreateThought from './createthought';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import Loading from '../../shared/components/loading/loading';

function Feed(props) {
  const user = props.user || {name: '', username: '', email: ''};
  const posts = props.posts || [];
  const { isLoading, onLike, onRepost, onCreatePost } = props;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="hidden md:block">
          <UserCard user={user} />
        </div>
        <div className="md:col-span-2 space-y-4">
          <CreateThought user={user} onCreatePost={onCreatePost} />
          {isLoading ? <Loading /> : <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} />}
        </div>
      </div>
    </div>
  );
}

export default Feed;
