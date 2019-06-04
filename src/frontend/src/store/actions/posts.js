import {
  CREATE_POST, DELETE_POST, REQUEST_POST,
  RECEIVE_POST, REQUEST_POSTS, RECEIVE_POSTS,
  LIKE_POST, UNLIKE_POST, RETWEET_POST
} from './types';

// Post

export function createPost() {
  return {
    type: CREATE_POST
  };
}

export function deletePost() {
  return {
    type: DELETE_POST
  };
}

// Fetch

export function requestPost() {
  return {
    type: REQUEST_POST
  };
}

export function receivePost() {
  return {
    type: RECEIVE_POST
  };
}

export function requestPosts() {
  return {
    type: REQUEST_POSTS
  };
}

export function receivePosts() {
  return {
    type: RECEIVE_POSTS
  };
}

// Actions

export function likePost(postId) {
  return {
    type: LIKE_POST,
    postId
  };
}

export function unlikePost(postId) {
  return {
    type: UNLIKE_POST,
    postId
  };
}

export function retweetPost(postId) {
  return {
    type: RETWEET_POST,
    postId
  };
}
