import { combineReducers } from 'redux';

import users from './users';
import posts from './posts';
import feed from './feed';

const reducer = combineReducers({
  users,
  posts,
  feed
});

export default reducer;
