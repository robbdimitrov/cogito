import { userProperties, addItem, removeItem, addItems } from './helpers';
import {
  REGISTER_USER, UPDATE_USER ,UPDATE_PASSWORD,
  FETCH_USER, FOLLOW_USER, UNFOLLOW_USER
} from '../actions/users';
import { LOGIN_USER, LOGOUT_USER } from '../actions/auth';
import {
  FETCH_FOLLOWING, FETCH_FOLLOWING_IDS,
  FETCH_FOLLOWERS, FETCH_FOLLOWERS_IDS
} from '../actions/follow';
import {
  addFollowing, addFollowingIds, addFollowers,
  addFollowersIds, followUser, unfollowUser
} from './follow';
import {
  LIKE_POST, UNLIKE_POST, RETWEET_POST, DELETE_RETWEET
} from '../actions/action';
import {
  CREATE_POST, DELETE_POST, FETCH_POSTS, FETCH_LIKES
} from '../actions/posts';
import { addId, addObject, updateObject } from './helpers';

// State

const initialState = {
  byId: {},
  allIds: []
};

// User

function addUser(state, action) {
  const { user } = action;

  if (!user) {
    return state;
  }

  return {
    byId: addObject(state.byId, {
      ...action.user,
      ...userProperties(user)
    }),
    allIds: addId(state.allIds, user.id)
  };
}

function updateUser(state, action) {
  const { userId, updates } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, updates)
  };
}

// Actions

function likePost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      likes: addItem(state.byId[userId].likes, postId)
    })
  };
}

function unlikePost(state, action, keys) {
  const { userId, postId } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      likes: removeItem(state.byId[userId].likes, postId)
    })
  };
}

function retweetPost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      retweets: addItem(state.byId[userId].retweets, postId)
    })
  };
}

function deleteRetweet(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      retweets: removeItem(state.byId[userId].retweets, postId)
    })
  };
}

// Post

function createPost(state, action) {
  const { userId, post } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      posts: addItem(state.byId[userId].posts, post.id)
    })
  };
}

function deletePost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      posts: removeItem(state.byId[userId].posts, postId)
    })
  };
}

// Fetch

function addPosts(state, action) {
  const { userId, posts, page } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      posts: addItems(state.byId[userId].posts, posts, page)
    })
  };
}

function addLikes(state, action) {
  const { userId, posts, page } = action;

  return {
    ...state,
    byId: updateObject(state.byId, userId, {
      likes: addItems(state.byId[userId].likes, posts, page)
    })
  };
}

// Main

function users(state = initialState, action) {
  switch (action.type) {
    case LOGIN_USER:
    case FETCH_USER:
      return addUser(state, action);
    case UPDATE_USER:
      return updateUser(state, action);
    case FOLLOW_USER:
      return followUser(state, action);
    case UNFOLLOW_USER:
      return unfollowUser(state, action);
    case FETCH_FOLLOWING:
      return addFollowing(state, action);
    case FETCH_FOLLOWING_IDS:
      return addFollowingIds(state, action);
    case FETCH_FOLLOWERS:
      return addFollowers(state, action);
    case FETCH_FOLLOWERS_IDS:
      return addFollowersIds(state, action);
    case LIKE_POST:
      return likePost(state, action);
    case UNLIKE_POST:
      return unlikePost(state, action);
    case RETWEET_POST:
      return retweetPost(state, action);
    case DELETE_RETWEET:
      return deleteRetweet(state, action);
    case CREATE_POST:
      return createPost(state, action);
    case DELETE_POST:
      return deletePost(state, action);
    case FETCH_POSTS:
      return addPosts(state, action);
    case FETCH_LIKES:
      return addLikes(state, action);
    case LOGOUT_USER:
      return initialState;
    case UPDATE_PASSWORD:
    case REGISTER_USER:
    default:
      return state;
  }
}

export default users;
