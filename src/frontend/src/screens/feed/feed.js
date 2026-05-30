import React from 'react';
import UserCard from './usercard';
import CreateThought from './createthought';
import ThoughtList from '../../shared/components/thoughtlist/thoughtlist';
import {FeedSkeleton} from '../../shared/components/skeleton/skeleton';

function Feed(props) {
  const user = props.user || {name: '', username: '', email: ''};
  const posts = props.posts || [];
  const { isLoading, onLike, onRepost, onCreatePost, onDeletePost, currentUserId } = props;

  return (
    <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-8">
        <aside className="hidden lg:block">
          <UserCard user={user} />
        </aside>
        <section className="space-y-4 max-w-2xl w-full mx-auto lg:mx-0">
          <CreateThought user={user} onCreatePost={onCreatePost} />
          {isLoading && posts.length === 0 ? <FeedSkeleton count={3} /> : <ThoughtList posts={posts} users={[user]} onLike={onLike} onRepost={onRepost} onDelete={onDeletePost} currentUserId={currentUserId} />}
        </section>
      </div>
    </main>
  );
}

export default Feed;
