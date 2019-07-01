import apiClient from '../../common/services/APIClient';
import session from '../../common/services/Session';
import { fetchFollowingIds, fetchFollowersIds } from './follow';
import { loginUser } from './auth';
import { handleError } from './errors';

// Register

export const REGISTER_USER = 'REGISTER_USER';
export function registerUser(name, username, email, password) {
  return function(dispatch) {
    apiClient.createUser(name, username, email, password).then((response) => {
      if (response.error) {
        dispatch(handleError(response.error));
        return;
      }

      dispatch(loginUser(email, password));
    });
  };
}

// Update

export const UPDATE_USER = 'UPDATE_USER';
export function updateUser(name, username, email, bio, avatar) {
  return function(dispatch) {
    apiClient.updateUser(name, username, email, bio, avatar)
      .then((response) => {
        if (response.error) {
          dispatch(handleError(response.error));
          return;
        }

        dispatch({
          type: UPDATE_USER,
          userId: session.getUserId(),
          updates: {
            name,
            username,
            email,
            bio,
            avatar
          }
        });
      });
  };
}

export function updateAvatar(file) {
  return function(dispatch) {
    apiClient.postImage(file).then((response) => {
      if (response.error) {
        dispatch(handleError(response.error));
        return;
      }

      const avatar = response.image;

      dispatch({
        type: UPDATE_USER,
        userId: session.getUserId(),
        updates: {
          avatar
        }
      });
    });
  };
}

export function updatePassword(password, oldPassword) {
  return function(dispatch) {
    apiClient.updatePassword(password, oldPassword).then((response) => {
      if (response.error) {
        dispatch(handleError(response.error));
        return;
      }

      dispatch({
        type: UPDATE_USER,
        userId: session.getUserId()
      });
    });
  };
}

// User

export const FETCH_USER = 'FETCH_USER';
export function fetchUser(userId, username) {
  return function(dispatch) {
    apiClient.getUser(userId, username).then((response) => {
      if (response.error) {
        dispatch(handleError(response.error));
      }

      dispatch({
        type: FETCH_USER,
        user: response.user
      });

      if (userId === session.getUserId()) {
        dispatch(fetchFollowingIds(userId));
        dispatch(fetchFollowersIds(userId));
      }
    });
  };
}

export function fetchUserIfNeeded(userId) {
  return function(dispatch, getState) {
    if (!userId) {
      return;
    }
    if (!getState().users.byId[userId]) {
      dispatch(fetchUser(userId));
    }
  };
}

// Actions

export const FOLLOW_USER = 'FOLLOW_USER';
export function followUser(userId) {
  return function(dispatch) {
    apiClient.followUser(userId).then((response) => {
      if (response.error) {
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
      if (response.error) {
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
