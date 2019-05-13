import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';

export class UserClient {
  constructor(userURI) {
    this.userURI = userURI;

    this.authClient = new services.UserServiceClient(this.userURI,
      grpc.credentials.createInsecure());
    this.sessionClient = new services.FollowServiceClient(this.userURI,
      grpc.credentials.createInsecure());
  }
}
