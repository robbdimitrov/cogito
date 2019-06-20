import { userProperties, addItems, addItem, removeItem } from './helpers';
import {
  addId, addIds, removeId, addObject,
  addObjects, updateObject, removeObject
} from './helpers';

const followingKey = 'following';
const followersKey = 'followers';

export function followUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    byId: {
      ...updateObject(state.byId, currentId, {
        following: addItem(state.byId[currentId].following, userId)
      }),
      ...updateObject(state.byId, userId, {
        followers: addItem(state.byId[userId].followers, currentId)
      })
    }
  };
}

export function unfollowUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    byId: {
      ...updateObject(state.byId, currentId, {
        following: removeItem(state.byId[currentId].following, userId)
      }),
      ...updateObject(state.byId, userId, {
        followers: removeItem(state.byId[userId].followers, currentId)
      })
    }
  };
}

function addUsers(state, action, key) {
  const { userId, users } = action;

  return {
    ...state,
    ...users.reduce((obj, user) => {
      obj[user.id] = {
        ...user,
        ...userProperties(user)
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

function addUsersIds(state, action, key) {
  const { userId, usersIds } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      [key]: addItems(state.byId[userId][key], usersIds)
    })
  };
}

export function addFollowing(state, action) {
  return addUsers(state, action, followingKey);
}

export function addFollowingIds(state, action) {
  return addUsersIds(state, action, followingKey);
}

export function addFollowers(state, action) {
  return addUsers(state, action, followersKey);
}

export function addFollowersIds(state, action) {
  return addUsersIds(state, action, followersKey);
}
