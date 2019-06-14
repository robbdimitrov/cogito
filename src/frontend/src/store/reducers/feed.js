import { FETCH_FEED } from '../actions/feed';
import { LOGOUT_USER } from '../actions/auth';

const initialState = {
  items: [],
  page: 0
};

function addPosts(state, action) {
  const { posts, page } = action;

  return {
    posts: posts.map((post) => post.id),
    page
  };
}

function feed(state = initialState, action) {
  switch (action.type) {
    case FETCH_FEED:
      return addPosts(state, action);
    case LOGOUT_USER:
      return initialState;
    default:
      return state;
  }
}

export default feed;
