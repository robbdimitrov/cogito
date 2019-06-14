import { combineReducers } from 'redux';

import actions from './actions';
import {
  CREATE_POST, DELETE_POST, FETCH_POST,
  FETCH_POSTS, FETCH_LIKES
} from '../actions/posts';

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
  actions,
  posts
});

export default reducer;
