import { FETCH_FEED } from '../actions/feed';
import { LOGOUT_USER } from '../actions/auth';
import { addObjectsIds } from './helpers';

const initialState = {
  items: [],
  page: 0
};

function addPosts(state, action) {
  const { posts, page } = action;

  return {
    posts: addObjectsIds(state.posts, posts),
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
