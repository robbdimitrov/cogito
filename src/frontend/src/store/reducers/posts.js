import { combineReducers } from 'redux';

import {
  CREATE_POST, DELETE_POST, FETCH_POST,
  FETCH_POSTS, FETCH_LIKES
} from '../actions/posts';
import {
  LIKE_POST, UNLIKE_POST, RETWEET_POST, DELETE_RETWEET
} from '../actions/action';

function postActions(state = [], action) {
  switch (action.type) {
    case LIKE_POST:
    case UNLIKE_POST:
    case RETWEET_POST:
    case DELETE_RETWEET:
    default:
      return state;
  }
}

function posts(state = [], action) {
  switch (action.type) {
    case CREATE_POST:
    case DELETE_POST:
    case FETCH_POST:
    case FETCH_POSTS:
    case FETCH_LIKES:
    default:
      return state;
  }
}

const reducer = combineReducers({
  postActions,
  posts
});

export default reducer;
