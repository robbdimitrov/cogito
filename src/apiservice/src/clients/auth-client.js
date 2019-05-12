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
}
