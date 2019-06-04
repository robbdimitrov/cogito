import {
  LOGIN_USER, LOGOUT_USER, REGISTER_USER, UPDATE_USER,
  REQUEST_USER, RECEIVE_USER, REQUEST_USERS,
  RECEIVE_USERS, FOLLOW_USER, UNFOLLOW_USER
} from './types';

// Auth

export function loginUser(email, password) {
  return {
    type: LOGIN_USER
  };
}

export function logoutUser() {
  return {
    type: LOGOUT_USER
  };
}

// User

export function registerUser() {
  return {
    type: REGISTER_USER
  };
}

export function updateUser() {
  return {
    type: UPDATE_USER
  };
}

// Fetch

export function requestUser() {
  return {
    type: REQUEST_USER
  };
}

export function receiveUser() {
  return {
    type: RECEIVE_USER
  };
}

export function requestUsers() {
  return {
    type: REQUEST_USERS
  };
}

export function receiveUsers() {
  return {
    type: RECEIVE_USERS
  };
}

// Actions

export function followUser(userId) {
  return {
    type: FOLLOW_USER,
    userId
  }
}

export function unfollowUser(userId) {
  return {
    type: UNFOLLOW_USER,
    userId
  }
}
