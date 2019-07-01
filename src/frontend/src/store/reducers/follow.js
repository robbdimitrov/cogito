import {
  userProperties, addItems, addItem, removeItem,
  addObjects, updateObject, updateObjects, addIds
} from './helpers';

const followingKey = 'following';
const followersKey = 'followers';

export function followUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    byId: updateObjects(state.byId, {
      [currentId]: {
        following: addItem(state.byId[currentId].following, userId)
      },
      [userId]: {
        followers: addItem(state.byId[userId].followers, currentId)
      }
    })
  };
}

export function unfollowUser(state, action) {
  const { currentId, userId } = action;

  return {
    ...state,
    byId: updateObjects(state.byId, {
      [currentId]: {
        following: removeItem(state.byId[currentId].following, userId)
      },
      [userId]: {
        followers: removeItem(state.byId[userId].followers, currentId)
      }
    })
  };
}

function addUsers(state, action, key) {
  const { userId } = action;

  const users = action.users.map((user) => {
    return {
      ...user,
      ...userProperties(user)
    };
  });
  const usersIds = users.map((user) => user.id);

  return {
    ...state,
    byId: {
      ...addObjects(state.byId, users),
      [userId]: {
        ...state.byId[userId],
        [key]: addItems(state.byId[userId][key], usersIds)
      }
    },
    allIds: addIds(state.allIds, usersIds)
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
