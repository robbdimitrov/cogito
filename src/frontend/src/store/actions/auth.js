import apiClient from '../../common/APIClient';
import session from '../../common/Session';
import { receiveUser } from './users';

export const CREATE_SESSION = 'CREATE_SESSION';
export function createSession() {
  return {
    type: CREATE_SESSION
  };
}

export const INVALIDATE_SESSION = 'INVALIDATE_SESSION';
export function invalidateSession() {
  return {
    type: INVALIDATE_SESSION
  };
}

export const LOGIN_USER_ERROR = 'LOGIN_USER_ERROR';
export function loginUserError(message) {
  return {
    type: LOGIN_USER_ERROR,
    message
  };
}

export function loginUser(email, password) {
  return (dispatch) => {
    apiClient.createSession(email, password).then((response) => {
      if (!response.ok) {
        dispatch(loginUserError(response.error.message));
        return;
      }

      session.setId(response.session_id);
      session.setToken(response.token.access_token);
      session.setRefreshToken(response.token.refresh_token);
      session.setUserId(response.user.id);

      dispatch(receiveUser(response.user));
      dispatch(createSession());
    });
  };
}

export function logoutUser() {
  return (dispatch) => {
    const sessionId = session.getId();
    apiClient.deleteSession(sessionId).then(() => {
      session.reset();
      dispatch(invalidateSession());
    });
  };
}
