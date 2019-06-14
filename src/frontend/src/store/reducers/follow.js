import { userProperties, addItems } from './helpers';
import {
  FETCH_FOLLOWING, FETCH_FOLLOWING_IDS,
  FETCH_FOLLOWERS, FETCH_FOLLOWERS_IDS
} from '../actions/follow';

export const followKeys = {
  following: 'following',
  followers: 'followers'
};

function addUsers(state = {}, action, key) {
  const { userId, users } = action;

  return {
    ...state,
    ...users.reduce((obj, user) => {
      obj[user.id] = {
        ...user,
        ...userProperties()
      };
      return obj;
    }),
    [userId]: {
      ...state[userId],
      [key]: addItems(state[userId][key],
        action.users.map((user) => user.id))
    }
  };
}

function addUsersIds(state = {}, action, key) {
  const { userId, usersIds } = action;

  return {
    ...state,
    [userId]: {
      ...state[userId],
      [key]: addItems(state[userId][key], usersIds)
    }
  };
}

function follow(state = {}, action) {
  switch (action.type) {
    case FETCH_FOLLOWING:
      return addUsers(state, action, followKeys.following);
    case FETCH_FOLLOWING_IDS:
      return addUsersIds(state, action, followKeys.following);
    case FETCH_FOLLOWERS:
      return addUsers(state, action, followKeys.followers);
    case FETCH_FOLLOWERS_IDS:
      return addUsersIds(state, action, followKeys.followers);
    default:
      return state;
  }
}

export default follow;
