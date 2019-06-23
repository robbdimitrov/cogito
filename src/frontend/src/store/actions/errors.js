export const HANDLE_ERROR = 'HANDLE_ERROR';
export function handleError(error) {
  return {
    type: HANDLE_ERROR,
    error
  };
}

export const DISMISS_ERROR = 'DISMISS_ERROR';
export function dismissError(errorId) {
  return {
    type: DISMISS_ERROR,
    errorId
  };
}
