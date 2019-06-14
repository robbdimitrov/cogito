import { combineReducers } from 'redux';
import follow from './follow';

import {
  REGISTER_USER, UPDATE_USER ,UPDATE_PASSWORD,
  FETCH_USER, FOLLOW_USER, UNFOLLOW_USER
} from '../actions/users';
import { LOGIN_USER, LOGOUT_USER } from '../actions/auth';

function users(state = {}, action) {
  switch (action.type) {
    case LOGIN_USER:
    case FETCH_USER:
      return {
        ...state,
        [action.user.id]: {
          ...action.user
        }
      };
    case LOGOUT_USER:
    case REGISTER_USER:
    case UPDATE_USER:
    case UPDATE_PASSWORD:
    case FOLLOW_USER:
    case UNFOLLOW_USER:
    default:
      return state;
  }
}

const reducer = combineReducers({
  follow,
  users
});

export default reducer;
