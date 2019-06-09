import { APIRouter } from './api-router';
import { getToken } from './utils';

export class AuthRouter extends APIRouter {
  constructor(authClient) {
    super();
    this.authClient = authClient;
  }

  connectRouter(router) {
    router.get('/', (req, res) => {
      this.getSessions(req, res);
    });

    router.delete('/:id', (req, res) => {
      this.deleteSession(req, res);
    });

    router.post('/', (req, res) => {
      if (req.body.email !== undefined) {
        this.login(req, res);
      } else {
        this.refreshToken(req, res);
      }
    });
  }

  // Authentication

  login(req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const userAgent = req.headers['user-agent'];

    this.handleResponse(
      this.authClient.createSession(email, password, userAgent), res
    );
  }

  refreshToken(req, res) {
    const token = getToken(req);

    this.handleResponse(this.authClient.refreshToken(token), res);
  }

  // Sessions

  getSessions(req, res) {
    const token = getToken(req);

    this.handleResponse(this.authClient.getSessions(token), res);
  }

  deleteSession(req, res) {
    const token = getToken(req);
    const sessionId = req.params.id;

    this.handleResponse(this.authClient.deleteSession(sessionId, token), res);
  }
}
