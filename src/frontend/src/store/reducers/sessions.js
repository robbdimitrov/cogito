import { FETCH_SESSIONS, DELETE_SESSION } from '../actions/sessions';
import { LOGOUT_USER } from '../actions/auth';
import { deleteObject } from '../../common/utils';

function addSessions(state, action) {
  const { sessions } = action;

  return {
    ...state,
    ...sessions.reduce((obj, session) => {
      obj[session.id] = {
        ...session
      };
      return obj;
    }),
  };
}

function deleteSession(state, action) {
  const { sessionId } = action;

  return {
    ...deleteObject(state, sessionId)
  };
}

function sessions(state = {}, action) {
  switch (action.type) {
    case FETCH_SESSIONS:
      return addSessions(state, action);
    case DELETE_SESSION:
      return deleteSession(state, action);
    case LOGOUT_USER:
      return {};
    default:
      return state;
  }
}

export default sessions;
