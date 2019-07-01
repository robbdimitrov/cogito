import { APIRouter } from './api-router';

export class AuthRouter extends APIRouter {
  constructor(authClient) {
    super();
    this.authClient = authClient;
  }

  connectRouter(router) {
    router.post('/', (req, res) => {
      if (req.body.email) {
        this.login(req, res);
      } else {
        this.refreshToken(req, res);
      }
    });

    router.get('/', (req, res) => {
      this.getSessions(req, res);
    });

    router.delete('/:id', (req, res) => {
      this.deleteSession(req, res);
    });
  }

  // Authentication

  login(req, res) {
    const email = req.body.email;
    const password = req.body.password;
    const userAgent = req.get('User-Agent');

    this.handleResponse(
      this.authClient.createSession(email, password, userAgent), res
    );
  }

  refreshToken(req, res) {
    const token = this.getToken(req);

    this.handleResponse(
      this.authClient.refreshToken(token), res
    );
  }

  // Sessions

  getSessions(req, res) {
    const token = this.getToken(req);

    this.handleResponse(
      this.authClient.getSessions(token), res
    );
  }

  deleteSession(req, res) {
    const token = this.getToken(req);
    const sessionId = req.params.id;

    this.handleResponse(
      this.authClient.deleteSession(sessionId, token), res
    );
  }
}
