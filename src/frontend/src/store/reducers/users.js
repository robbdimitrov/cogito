import { combineReducers } from 'redux';

import follow from './follow';
import { userProperties, addItem, removeItem } from './helpers';
import {
  REGISTER_USER, UPDATE_USER ,UPDATE_PASSWORD,
  FETCH_USER, FOLLOW_USER, UNFOLLOW_USER
} from '../actions/users';
import { LOGIN_USER, LOGOUT_USER } from '../actions/auth';

function addUser(state, action) {
  const { user } = action;

  return {
    ...state,
    [user.id]: {
      ...user,
      ...userProperties(user)
    }
  };
}

function updateUser(state, action) {
  const { userId, name, username, email, bio, avatar } = action;

  return {
    ...state,
    [userId]: {
      ...state[userId],
      name, username, email, bio, avatar
    }
  };
}

function followUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    [currentId]: {
      ...state[currentId],
      following: addItem(state[currentId].following, userId)
    },
    [userId]: {
      ...state[userId],
      followers: addItem(state[userId].followers, currentId)
    }
  };
}

function unfollowUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    [currentId]: {
      ...state[currentId],
      following: removeItem(state[currentId].following, userId)
    },
    [userId]: {
      ...state[userId],
      followers: removeItem(state[userId].followers, currentId)
    }
  };
}

function users(state = {}, action) {
  switch (action.type) {
    case FETCH_USER:
      return addUser(state, action);
    case UPDATE_USER:
      return updateUser(state, action);
    case FOLLOW_USER:
      return followUser(state, action);
    case UNFOLLOW_USER:
      return unfollowUser(state, action);
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
