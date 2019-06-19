import { FETCH_SESSIONS, DELETE_SESSION } from '../actions/sessions';
import { LOGOUT_USER } from '../actions/auth';

const initialState = {
  byId: {},
  allIds: []
};

function addSessions(state, action) {
  const { sessions } = action;

  return {
    byId: {
      ...state.byId,
      ...sessions.reduce((obj, session) => {
        obj[session.id] = {
          ...session
        };
        return obj;
      })
    },
    allIds: [
      ...state.allIds,
      ...Object.keys(sessions).map(Number)
    ]
  };
}

function deleteSession(state, action) {
  const { sessionId } = action;

  return {
    byId: Object.keys(state.byId).reduce((obj, key) => {
      if (key !== sessionId) {
        obj[key] = state[key];
      }
      return obj;
    }, {}),
    allIds: state.allIds.filter((item) => item !== sessionId)
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
