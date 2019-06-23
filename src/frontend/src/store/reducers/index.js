import { combineReducers } from 'redux';

import errors from './errors';
import users from './users';
import posts from './posts';
import feed from './feed';
import sessions from './sessions';

const reducer = combineReducers({
  errors,
  users,
  posts,
  feed,
  sessions
});

export default reducer;
