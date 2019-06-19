import { FETCH_SESSIONS, DELETE_SESSION } from '../actions/sessions';
import { LOGOUT_USER } from '../actions/auth';
import { addIds, removeId, addObjects, removeObject } from './helpers';

const initialState = {
  byId: {},
  allIds: []
};

function addSessions(state, action) {
  const { sessions } = action;

  const sessionsIds = Object.keys(sessions).map(Number);

  return {
    byId: addObjects(state.byId, sessions),
    allIds: addIds(state.allIds, sessionsIds)
  };
}

function deleteSession(state, action) {
  const { sessionId } = action;

  return {
    byId: removeObject(state.byId, sessionId),
    allIds: removeId(state.allIds, sessionId)
  };
}

function sessions(state = initialState, action) {
  switch (action.type) {
    case FETCH_SESSIONS:
      return addSessions(state, action);
    case DELETE_SESSION:
      return deleteSession(state, action);
    case LOGOUT_USER:
      return initialState;
    default:
      return state;
  }
}

export default sessions;
