import apiClient from '../../common/APIClient';

export const CREATE_POST = 'CREATE_POST';
export function createPost() {
  return {
    type: CREATE_POST
  };
}

export const DELETE_POST = 'DELETE_POST';
export function deletePost() {
  return {
    type: DELETE_POST
  };
}

// Fetch

export function fetchPost(postId) {
  return function(dispatch) {
    dispatch(requestPost(postId));
  };
}

export function fetchPosts(username, page, limit) {
  return function(dispatch) {
    dispatch(requestPosts(username));
  };
}

export function fetchLikes(username, page, limit) {
  return function(dispatch) {
    dispatch(requestPosts(username));
  };
}

export const REQUEST_LIKES = 'REQUEST_LIKES';
export function requestLikes(userId) {
  return {
    type: REQUEST_LIKES
  };
}

export const RECEIVE_LIKES = 'RECEIVE_LIKES';
export function receiveLikes() {
  return {
    type: RECEIVE_LIKES
  };
}

export const REQUEST_POST = 'REQUEST_POST';
export function requestPost(postId) {
  return {
    type: REQUEST_POST,
    postId
  };
}

export const RECEIVE_POST = 'REQUEST_POST';
export function receivePost() {
  return {
    type: RECEIVE_POST
  };
}

export const REQUEST_POSTS = 'REQUEST_POSTS';
export function requestPosts(username) {
  return {
    type: REQUEST_POSTS,
    username
  };
}

export const RECEIVE_POSTS = 'RECEIVE_POSTS';
export function receivePosts() {
  return {
    type: RECEIVE_POSTS
  };
}

// Actions

export const LIKE_POST = 'LIKE_POST';
export function likePost(postId) {
  return {
    type: LIKE_POST,
    postId
  };
}

export const UNLIKE_POST = 'UNLIKE_POST';
export function unlikePost(postId) {
  return {
    type: UNLIKE_POST,
    postId
  };
}

export const RETWEET_POST = 'RETWEET_POST';
export function retweetPost(postId) {
  return {
    type: RETWEET_POST,
    postId
  };
}
