import {
  CREATE_POST, DELETE_POST, FETCH_POST,
  FETCH_POSTS, FETCH_LIKES
} from '../actions/posts';
import {
  LIKE_POST, UNLIKE_POST, RETWEET_POST, DELETE_RETWEET
} from '../actions/action';

// Post

function addPost(state, action) {
  const { post } = action;

  return {
    ...state,
    [post.id]: {
      ...post
    }
  };
}

function deletePost(state, action) {
  const { postId } = action;

  return {
    ...Object.keys(state).reduce((obj, key) => {
      if (key !== postId) {
        obj[key] = state[key];
      }
      return obj;
    }, {})
  };
}

// Actions

function likePost(state, action) {
  const { postId } = action;

  return {
    ...state,
    [postId]: {
      ...state[postId],
      likes: state[postId].likes + 1,
      liked: true
    }
  };
}

function unlikePost(state, action) {
  const { postId } = action;

  return {
    ...state,
    [postId]: {
      ...state[postId],
      likes: state[postId].likes - 1,
      liked: false
    }
  };
}

function retweetPost(state, action) {
  const { postId } = action;

  return {
    ...state,
    [postId]: {
      ...state[postId],
      retweets: state[postId].retweets + 1,
      retweeted: true
    }
  };
}

function deleteRetweet(state, action) {
  const { postId } = action;

  return {
    ...state,
    [postId]: {
      ...state[postId],
      retweets: state[postId].retweets - 1,
      retweeted: false
    }
  };
}

// Fetch

function addPosts(state, action) {
  const { posts } = action;

  return {
    ...posts.reduce((obj, post) => {
      obj[post.id] = {
        ...post
      };
      return obj;
    }),
  };
}

// Main

function posts(state = {}, action) {
  switch (action.type) {
    case CREATE_POST:
      return addPost(state, action);
    case DELETE_POST:
      return deletePost(state, action);
    case LIKE_POST:
      return likePost(state, action);
    case UNLIKE_POST:
      return unlikePost(state, action);
    case RETWEET_POST:
      return retweetPost(state, action);
    case DELETE_RETWEET:
      return deleteRetweet(state, action);
    case FETCH_POST:
      return addPost(state, action);
    case FETCH_POSTS:
    case FETCH_LIKES:
      return addPosts(state, action);
    default:
      return state;
  }
}

export default posts;
