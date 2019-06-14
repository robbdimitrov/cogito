import {
  LIKE_POST, UNLIKE_POST, RETWEET_POST, DELETE_RETWEET
} from '../actions/action';
import { addItem, removeItem } from './helpers';

function likePost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        likes: addItem(state.users[userId], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        likes: state.posts[postId].likes + 1,
        liked: true
      }
    }
  };
}

function unlikePost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        likes: removeItem(state.users[userId], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        likes: state.posts[postId].likes - 1,
        liked: false
      }
    }
  };
}

function retweetPost(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        retweets: addItem(state.users[userId], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        retweets: state.posts[postId].likes + 1,
        retweeted: true
      }
    }
  };
}

function deleteRetweet(state, action) {
  const { userId, postId } = action;

  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        retweets: removeItem(state.users[userId], postId)
      }
    },
    posts: {
      ...state.posts,
      [postId]: {
        ...state.posts[postId],
        retweets: state.posts[postId].likes - 1,
        retweeted: false
      }
    }
  };
}

function actions(state = {}, action) {
  switch (action.type) {
    case LIKE_POST:
      return likePost(state, action);
    case UNLIKE_POST:
      return unlikePost(state, action);
    case RETWEET_POST:
      return retweetPost(state, action);
    case DELETE_RETWEET:
      return deleteRetweet(state, action);
    default:
      return state;
  }
}

export default actions;
