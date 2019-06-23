import apiClient from '../../common/services/APIClient';

export const FETCH_SESSIONS = 'FETCH_SESSIONS';
export function fetchSessions() {
  return function(dispatch) {
    apiClient.getSessions().then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: FETCH_SESSIONS,
        sessions: response.sessions
      });
    });
  };
}

export const DELETE_SESSION = 'DELETE_SESSION';
export function deleteSession(sessionId) {
  return function(dispatch) {
    apiClient.deleteSession(sessionId).then((response) => {
      if (!response.ok) {
        return;
      }
      dispatch({
        type: DELETE_SESSION,
        sessionId
      });
    });
  };
}
