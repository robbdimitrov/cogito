import apiClient from '../../common/services/APIClient';
import session from '../../common/services/Session';
import { handleError } from './errors';
import { fetchFollowingIds, fetchFollowersIds } from './follow';

export const LOGIN_USER = 'LOGIN_USER';
export function loginUser(email, password) {
  return (dispatch) => {
    apiClient.createSession(email, password).then((response) => {
      if (!response.ok) {
        dispatch(handleError(response.error));
        return;
      }

      session.setId(response.session_id);
      session.setToken(response.token.access_token);
      session.setRefreshToken(response.token.refresh_token);
      session.setUserId(response.user.id);

      dispatch(fetchFollowingIds(response.user.id));
      dispatch(fetchFollowersIds(response.user.id));
      dispatch({
        type: LOGIN_USER,
        user: response.user
      });
    });
  };
}

export const LOGOUT_USER = 'LOGOUT_USER';
export function logoutUser() {
  return (dispatch) => {
    const sessionId = session.getId();
    apiClient.deleteSession(sessionId).then(() => {
      session.reset();

      dispatch({
        type: LOGOUT_USER
      });
    });
  };
}
