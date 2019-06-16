import apiClient from '../../common/APIClient';
import session from '../../common/Session';
import { fetchFollowingIds, fetchFollowersIds } from './follow';
import { loginUser } from './auth';

// Register

export const REGISTER_USER = 'REGISTER_USER';
export function registerUser(name, username, email, password) {
  return (dispatch) => {
    apiClient.registerUser(name, username, email, password).then((response) => {
      if (!response.ok) {
        dispatch({
          type: REGISTER_USER,
          error: response.error.message
        });
        return;
      }

      dispatch(loginUser(email, password));
    });
  };
}

// Update

export const UPDATE_USER = 'UPDATE_USER';
export function updateUser(name, username, email, bio, avatar) {
  return (dispatch) => {
    apiClient.updateUser(name, username, email, bio,
      undefined, undefined, avatar).then((response) => {
        if (!response.ok) {
          dispatch({
            type: UPDATE_USER,
            error: response.error.message
          });
          return;
        }

        dispatch({
          type: UPDATE_USER,
          userId: session.getUserId(),
          name, username, email, bio, avatar
        });
      });
  };
}

export const UPDATE_PASSWORD = 'UPDATE_PASSWORD';
export function updatePassword(password, oldPassword) {
  return (dispatch) => {
    apiClient.updateUser(undefined, undefined, undefined, undefined,
      password, oldPassword).then((response) => {
        if (!response.ok) {
          dispatch({
            type: UPDATE_PASSWORD,
            error: response.error.message
          });
          return;
        }

        dispatch({
          type: UPDATE_PASSWORD
        });
      });
  };
}

// User

export const FETCH_USER = 'FETCH_USER';
export function fetchUser(userId, username) {
  return (dispatch) => {
    apiClient.getUser(userId, username).then((response) => {
      if (!response.ok) {
        dispatch({
          type: FETCH_USER,
          userId,
          error: response.error.message
        });
      }

      dispatch({
        type: FETCH_USER,
        user: response.user
      });
    });
  };
}

export function fetchUserIfNeeded(userId) {
  return function(dispatch, getState) {
    if (!getState().users[userId]) {
      if (userId === session.getUserId()) {
        dispatch(fetchFollowingIds(userId));
        dispatch(fetchFollowersIds(userId));
      }
      return dispatch(fetchUser(userId));
    }
  };
}

// Actions

export const FOLLOW_USER = 'FOLLOW_USER';
export function followUser(userId) {
  return function(dispatch) {
    apiClient.followUser(userId).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: FOLLOW_USER,
        currentId: session.getUserId(),
        userId
      });
    });
  };
}

export const UNFOLLOW_USER = 'UNFOLLOW_USER';
export function unfollowUser(userId) {
  return function(dispatch) {
    apiClient.unfollowUser(userId).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: UNFOLLOW_USER,
        currentId: session.getUserId(),
        userId
      });
    });
  };
}
