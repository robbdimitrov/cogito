import * as grpc from 'grpc';

import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';
import { APIClient } from './api-client';

export class AuthClient extends APIClient {
  constructor(serviceURI, userClient) {
    super(serviceURI);

    this.userClient = userClient;
    this.authClient = new services.AuthServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
    this.sessionClient = new services.SessionServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
  }

  // Authentication

  createSession(email, password, userAgent) {
    const request = new messages.Credentials();
    request.setEmail(email);
    request.setPassword(password);
    request.setUserAgent(userAgent);

    return new Promise((res, rej) => {
      this.authClient.login(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        const token = {
          token_type: response.getTokenType(),
          access_token: response.getAccessToken(),
          refresh_token: response.getRefreshToken()
        };
        const session_id = response.getSessionId();
        this.userClient.getUser(response.getUserId())
          .then((result) => {
            const user = result;
            res({
              user, token, session_id
            });
          }).catch((error) => {
            rej(error);
          });
      });
    });
  }

  refreshToken(token) {
    const request = new messages.AuthRequest();
    request.setToken(token);

    return new Promise((res, rej) => {
      this.authClient.refresh(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        const token = {
          token_type: response.getTokenType(),
          access_token: response.getAccessToken(),
          refresh_token: response.getRefreshToken()
        };
        res({ token });
      });
    });
  }

  // Sessions

  getSessions(token) {
    const request = new messages.AuthRequest();
    request.setToken(token);

    return new Promise((res, rej) => {
      this.sessionClient.getSessions(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const sessions = [];
        for (const item of response.getSessions()) {
          const session = {
            id: item.getId(),
            name: item.getName(),
            user_agent: item.getUserAgent(),
            user_id: item.getUserId(),
            date_created: item.getDateCreated()
          };
          sessions.push(session);
        }
        res({ sessions });
      });
    });
  }

  deleteSession(sessionId, token) {
    const request = new messages.AuthRequest();
    request.setSessionId(sessionId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.sessionClient.deleteSession(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }
}
