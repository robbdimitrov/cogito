import Session from '../services/session';

export function authGuard() {
  return {
    allowed: Session.getUserId() !== null,
    redirectTo: '/login',
  };
};

export function unauthGuard() {
  return {
    allowed: Session.getUserId() === null,
    redirectTo: '/',
  };
};
