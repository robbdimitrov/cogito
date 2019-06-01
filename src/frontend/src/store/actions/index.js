import {
  LOGIN_USER, SUCCESS, ERROR
} from '../constants';

export function loginUser(email, password) {
  return {
    type: LOGIN_USER,
  };
}

export function success(message) {
  return {
    type: SUCCESS,
    message
  };
}

export function error(message) {
  return {
    type: ERROR,
    message
  };
}
