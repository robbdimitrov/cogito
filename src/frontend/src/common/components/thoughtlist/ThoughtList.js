import React from 'react';
import PropTypes from 'prop-types';

import ThoughtItem from './ThoughtItem';
import './ThoughtList.scss';

function ThoughtList({ posts, users }) {
  return (
    <ul className="thought-list">
      {posts.map((post) =>
        <ThoughtItem key={post.id} post={post} user={users[0]} />
      )}
    </ul>
  );
}

ThoughtList.propTypes = {
  posts: PropTypes.array.isRequired,
  users: PropTypes.array.isRequired
};

export default ThoughtList;
