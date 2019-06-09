import { combineReducers } from 'redux';

import postsReducer from './posts';
import usersReducer from './users';

const reducer = combineReducers({
  postsReducer,
  usersReducer
});

export default reducer;
