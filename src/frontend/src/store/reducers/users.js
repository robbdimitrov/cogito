import { combineReducers } from 'redux';

import follow from './follow';
import { userProperties, addItem, removeItem } from './helpers';
import {
  REGISTER_USER, UPDATE_USER ,UPDATE_PASSWORD,
  FETCH_USER, FOLLOW_USER, UNFOLLOW_USER
} from '../actions/users';
import { LOGIN_USER, LOGOUT_USER } from '../actions/auth';

function users(state = {}, action) {
  switch (action.type) {
    case FETCH_USER:
      return {
        ...state,
        [action.user.id]: {
          ...action.user,
          ...userProperties(action.user)
        }
      };
    case UPDATE_USER:
      return {
        ...state,
        [action.userId]: {
          ...state[action.userId],
          name: action.name,
          username: action.username,
          email: action.email,
          bio: action.bio,
          avatar: action.avatar
        }
      }
    case FOLLOW_USER:
      return {
        ...state,
        [action.currentId]: {
          ...state[action.currentId],
          following: addItem(state[action.currentId].following, action.userId)
        },
        [action.userId]: {
          ...state[action.userId],
          following: addItem(state[action.userId].followers, action.currentId)
        }
      }
    case UNFOLLOW_USER:
      return {
        ...state,
        [action.currentId]: {
          ...state[action.currentId],
          following: removeItem(state[action.currentId].following, action.userId)
        },
        [action.userId]: {
          ...state[action.userId],
          following: removeItem(state[action.userId].followers, action.currentId)
        }
      }
    case UPDATE_PASSWORD:
    case REGISTER_USER:
    case LOGIN_USER:
    case LOGOUT_USER:
    default:
      return state;
  }
}

const reducer = combineReducers({
  follow,
  users
});

export default reducer;
