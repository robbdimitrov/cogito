import { HANDLE_ERROR, DISMISS_ERROR } from '../actions/errors';
import { addId, removeId, addObject, removeObject } from './helpers';
import { LOGOUT_USER } from '../actions/auth';

const initialState = {
  byId: {},
  allIds: []
};

function handleError(state, action) {
  const { error } = action;

  const errorId = state.allIds.length;

  return {
    byId: addObject(state.byId, {
      id: errorId,
      ...error
    }),
    allIds: addId(state.allIds, errorId)
  };
}

function dismissError(state, action) {
  const { errorId } = action;

  return {
    byId: removeObject(state.byId, errorId),
    allIds: removeId(state.allIds, errorId)
  };
}

function errors(state = initialState, action) {
  switch (action.type) {
    case HANDLE_ERROR:
      return handleError(state, action);
    case DISMISS_ERROR:
      return dismissError(state, action);
    case LOGOUT_USER:
      return initialState;
    default:
      return state;
  }
}

export default errors;
