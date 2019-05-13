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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({
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
        let sessions = [];
        for (item in response.getSessions()) {
          let session = {
            'id': item.getId(),
            'name': item.getName(),
            'user_agent': item.getUserAgent(),
            'user_id': item.getUserId(),
            'date_created': item.getDateCreated()
          };
          sessions.push(session);
        }
        res(sessions);
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
          return rej({
            'code': error.getCode(),
            'error': error.getError(),
            'message': error.getMessage()
          });
        }
        res({'message': respose.getMessage()});
      });
    });
  }
}
