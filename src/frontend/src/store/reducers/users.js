import { combineReducers } from 'redux';

import {
  REGISTER_USER, UPDATE_USER ,UPDATE_PASSWORD,
  FETCH_USER, FOLLOW_USER, UNFOLLOW_USER
} from '../actions/users';
import { LOGIN_USER, LOGOUT_USER } from '../actions/auth';
import { FETCH_FOLLOWING, FETCH_FOLLOWERS } from '../actions/follow';

function userFollow(state = [], action) {
  switch (action.type) {
    case FETCH_FOLLOWING:
    case FETCH_FOLLOWERS:
    default:
      return state;
  }
}

function userAuth(state = [], action) {
  switch (action.type) {
    case LOGIN_USER:
    case LOGOUT_USER:
    default:
      return state;
  }
}

function users(state = {}, action) {
  switch (action.type) {
    case REGISTER_USER:
    case UPDATE_USER:
    case UPDATE_PASSWORD:
    case FETCH_USER:
    case FOLLOW_USER:
    case UNFOLLOW_USER:
    default:
      return state;
  }
}

const reducer = combineReducers({
  userFollow,
  userAuth,
  users
});

export default reducer;
