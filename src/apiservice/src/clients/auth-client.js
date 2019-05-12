import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';

export class AuthClient {
  constructor(authURI) {
    this.authURI = authURI;

    this.authClient = new services.AuthServiceClient(this.authURI,
      grpc.credentials.createInsecure());
    this.sessionClient = new services.SessionServiceClient(this.authURI,
      grpc.credentials.createInsecure());
  }

  // Authentication

  createSession(email, password, userAgent) {
    let request = new messages.Credentials();
    request.setEmail(email);
    request.setPassword(password);
    request.setUserAgent(userAgent);

    return new Promise((res, rej) => {
      this.authClient.login(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return res.status(error.getCode()).send({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res.send({
          'token_type': respose.getTokenType(),
          'access_token': response.getAccessToken(),
          'refresh_token': response.getRefreshToken()
        });
      });
    });
  }

  refreshToken(token) {
    let request = new messages.AuthRequest();
    request.setToken(token);

    return new Promise((res, rej) => {
      this.authClient.refresh(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return res.status(error.getCode()).send({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res.send({
          'token_type': respose.getTokenType(),
          'access_token': response.getAccessToken(),
          'refresh_token': response.getRefreshToken()
        });
      });
    });
  }

  // Sessions

  getSessions(token) {
    let request = new messages.AuthRequest();
    request.setToken(token);

    return new Promise((res, rej) => {
      this.sessionClient.getSessions(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let sessions = response.getSessions();
        res(JSON.stringify(sessions));
      });
    });
  }

  deleteSession(sessionId, token) {
    let request = new messages.AuthRequest()
    request.setSessionId(sessionId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.sessionClient.deleteSession(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return res.status(error.getCode()).send({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res.send({
          'message': respose.getMessage()
        });
      });
    });
  }
}
