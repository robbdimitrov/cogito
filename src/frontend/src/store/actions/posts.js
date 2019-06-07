import { apiRoot } from '../../../config';
import {
  CREATE_POST, DELETE_POST,
  REQUEST_FEED, RECEIVE_FEED,
  REQUEST_LIKES, RECEIVE_LIKES,
  REQUEST_POST, RECEIVE_POST,
  REQUEST_POSTS, RECEIVE_POSTS,
  LIKE_POST, UNLIKE_POST,
  RETWEET_POST
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

export function fetchPost(postId) {
  return function(dispatch) {
    dispatch(requestPost(postId));
    return fetch(`${apiRoot}/posts/${postId}`)
      .then(response => response.json())
      .then(json => dispatch(receivePost(postId, json)));
  };
}

export function fetchPosts(username, page, limit) {
  return function(dispatch) {
    dispatch(requestPosts(username));
    return fetch(`${apiRoot}/users/${username}/posts?page=${page}&limit=${limit}`)
      .then(response => response.json())
      .then(json => dispatch(receivePosts(username, json)));
  };
}

export function fetchLikes(username, page, limit) {
  return function(dispatch) {
    dispatch(requestPosts(username));
    return fetch(`${apiRoot}/users/${username}/likes?page=${page}&limit=${limit}`)
      .then(response => response.json())
      .then(json => dispatch(receivePosts(username, json)));
  };
}

export function fetchFeed(userId, page, limit) {
  return function(dispatch) {
    dispatch(requestPosts(userId));
    return fetch(`${apiRoot}/feed?page=${page}&limit=${limit}`)
      .then(response => response.json())
      .then(json => dispatch(receivePosts(userId, json)));
  };
}

export function requestFeed(userId) {
  return {
    type: REQUEST_FEED
  };
}

export function receiveFeed() {
  return {
    type: RECEIVE_FEED
  };
}

export function requestLikes(userId) {
  return {
    type: REQUEST_LIKES
  };
}

export function receiveLikes() {
  return {
    type: RECEIVE_LIKES
  };
}

export function requestPost(postId) {
  return {
    type: REQUEST_POST,
    postId
  };
}

export function receivePost() {
  return {
    type: RECEIVE_POST
  };
}

export function requestPosts(username) {
  return {
    type: REQUEST_POSTS,
    username
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
