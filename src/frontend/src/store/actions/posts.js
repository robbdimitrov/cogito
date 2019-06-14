import apiClient from '../../common/APIClient';
import session from '../../common/Session';

export const CREATE_POST = 'CREATE_POST';
export function createPost(content) {
  return function(dispatch) {
    apiClient.createPost(content).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: CREATE_POST,
        userId: session.getUserId(),
        post: response.post
      });
    });
  };
}

export const DELETE_POST = 'DELETE_POST';
export function deletePost(postId) {
  return function(dispatch) {
    apiClient.deletePost(postId).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: DELETE_POST,
        userId: session.getUserId(),
        postId
      });
    });
  };
}

// Fetch

export const FETCH_POST = 'FETCH_POST';
export function fetchPost(postId) {
  return function(dispatch) {
    apiClient.getPost(postId).then((response) => {
      if (!response.ok) {
        dispatch({
          type: FETCH_POST,
          postId,
          error: response.error.message
        });
        return;
      }

      dispatch({
        type: FETCH_POST,
        post: response.post
      });
    });
  };
}

export const FETCH_POSTS = 'FETCH_POSTS';
export function fetchPosts(userId, page) {
  return function(dispatch) {
    apiClient.getPosts(userId, page).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: FETCH_POSTS,
        userId,
        posts: response.posts,
        page
      });
    });
  };
}

export const FETCH_LIKES = 'FETCH_LIKES';
export function fetchLikes(userId, page, limit) {
  return function(dispatch) {
    apiClient.getLikes(userId, page).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: FETCH_LIKES,
        userId,
        posts: response.posts,
        page
      });
    });
  };
}
