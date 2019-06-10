import apiClient from '../../common/APIClient';
import { loginUser } from './auth';

// Register

export const USER_REGISTER_ERROR = 'USER_REGISTER_ERROR';
export function userRegisterError(message) {
  return {
    type: USER_REGISTER_ERROR,
    message
  };
}

export const REGISTER_USER = 'REGISTER_USER';
export function registerUser(name, username, email, password) {
  return (dispatch) => {
    apiClient.registerUser(name, username, email, password).then((response) => {
      if (!response.ok) {
        dispatch(userRegisterError(response.error.message));
        return;
      }

      dispatch(loginUser(email, password));
    });
  };
}

// Update

export const USER_UPDATE_ERROR = 'USER_UPDATE_ERROR';
export function userUpdateError(message) {
  return {
    type: USER_UPDATE_ERROR,
    message
  };
}

export const UPDATED_USER = 'UPDATED_USER';
export function updatedUser(name, username, email, bio, avatar) {
  return {
    type: UPDATED_USER,
    name, username, email, bio, avatar
  };
}

export function updateUser(name, username, email, bio, avatar) {
  return (dispatch) => {
    apiClient.updateUser(name, username, email, bio,
      undefined, undefined, avatar).then((response) => {
        if (!response.ok) {
          dispatch(userUpdateError(response.error.message));
          return;
        }

        dispatch(updatedUser(name, username, email, bio, avatar));
      });
  };
}

export const UPDATED_PASSWORD = 'UPDATED_PASSWORD';
export function updatedPassword() {
  return {
    type: UPDATED_PASSWORD
  };
}

export function updatePassword(password, oldPassword) {
  return (dispatch) => {
    apiClient.updateUser(undefined, undefined, undefined, undefined,
      password, oldPassword).then((response) => {
        if (!response.ok) {
          dispatch(userUpdateError(response.error.message));
          return;
        }

        dispatch(updatedPassword());
      });
  };
}

// User

export const REQUEST_USER_ERROR = 'REQUEST_USER_ERROR';
export function requestUserError(message) {
  return {
    type: REQUEST_USER_ERROR,
    message
  };
}

export const REQUEST_USER = 'REQUEST_USER';
export function requestUser(userId) {
  return {
    type: REQUEST_USER,
    userId
  };
}

export const RECEIVE_USER = 'RECEIVE_USER';
export function receiveUser(user) {
  return {
    type: RECEIVE_USER,
    user
  };
}

export function fetchUser(userId) {
  return (dispatch) => {
    dispatch(requestUser());

    apiClient.getUser(userId).then((response) => {
      if (!response.ok) {
        dispatch(requestUserError(response.error.message));
      }

      dispatch(receiveUser(response.user));
    });
  };
}

// Followers

export const REQUEST_FOLLOWING = 'REQUEST_FOLLOWING';
export function requestFollowing(userId) {
  return {
    type: REQUEST_FOLLOWING,
    userId
  };
}

export const RECEIVE_FOLLOWING = 'RECEIVE_FOLLOWING';
export function receiveFollowing(userId, users) {
  return {
    type: RECEIVE_FOLLOWING,
    userId,
    users
  };
}

export function fetchFollowing(userId, page) {
  return (dispatch) => {
    dispatch(requestFollowing(userId));

    apiClient.getFollowing(userId, page).then((response) => {
      if (!response.ok) {
        dispatch(requestUserError(response.error.message));
        return;
      }

      dispatch(receiveFollowing(userId, response.users));
    })
  };
}

export const REQUEST_FOLLOWERS = 'REQUEST_FOLLOWERS';
export function requestFollowers(userId) {
  return {
    type: REQUEST_FOLLOWERS,
    userId
  };
}

export const RECEIVE_FOLLOWERS = 'RECEIVE_FOLLOWERS';
export function receiveFollowers(userId, users) {
  return {
    type: RECEIVE_FOLLOWERS,
    userId,
    users
  };
}

export function fetchFollowers(userId, page) {
  return (dispatch) => {
    dispatch(requestFollowers(userId));

    apiClient.getFollowers(userId, page).then((response) => {
      if (!response.ok) {
        dispatch(requestUserError(response.error.message));
        return;
      }

      dispatch(receiveFollowers(userId, response.users));
    });
  };
}

// Actions

export const FOLLOW_USER = 'FOLLOW_USER';
export function followUser(userId) {
  return {
    type: FOLLOW_USER,
    userId
  }
}

export const UNFOLLOW_USER = 'UNFOLLOW_USER';
export function unfollowUser(userId) {
  return {
    type: UNFOLLOW_USER,
    userId
  }
}
