import { combineReducers } from 'redux';

import users from './users';
import posts from './posts';
import feed from './feed';
import sessions from './sessions';

const reducer = combineReducers({
  users,
  posts,
  feed,
  sessions
});

export default reducer;
