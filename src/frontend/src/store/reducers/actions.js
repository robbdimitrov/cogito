import {
  LIKE_POST, UNLIKE_POST, RETWEET_POST, DELETE_RETWEET
} from '../actions/action';
import { addItem, removeItem } from './helpers';

const actionKeys = {
  like: {
    normal: 'likes',
    active: 'liked'
  },
  retweet: {
    normal: 'retweets',
    active: 'retweeted'
  }
};

function addAction(state, action, keys) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        [keys.normal]: addItem(state.users[userId][keys.normal], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        [keys.normal]: state.posts[postId][keys.normal] + 1,
        [keys.active]: true
      }
    }
  };
}

function removeAction(state, action, keys) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        [keys.normal]: removeItem(state.users[userId][keys.normal], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        [keys.normal]: state.posts[postId][keys.normal] - 1,
        [keys.active]: false
      }
    }
  };
}

function actions(state = {}, action) {
  switch (action.type) {
    case LIKE_POST:
      return addAction(state, action, actionKeys.like);
    case UNLIKE_POST:
      return removeAction(state, action, actionKeys.like);
    case RETWEET_POST:
      return addAction(state, action, actionKeys.retweet);
    case DELETE_RETWEET:
      return removeAction(state, action, actionKeys.retweet);
    default:
      return state;
  }
}

export default actions;
