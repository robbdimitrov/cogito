import { userProperties, addItems, addItem, removeItem } from './helpers';

const followingKey = 'following';
const followersKey = 'followers';

export function followUser(state, action) {
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

export function unfollowUser(state, action) {
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

function addUsers(state, action, key) {
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

function addUsersIds(state, action, key) {
  const { userId, usersIds } = action;

  return {
    ...state,
    [userId]: {
      ...state[userId],
      [key]: addItems(state[userId][key], usersIds)
    }
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
