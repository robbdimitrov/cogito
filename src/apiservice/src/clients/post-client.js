import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';

export class PostClient {
  constructor(postURI) {
    this.postURI = postURI;

    this.authClient = new services.PostServiceClient(this.postURI,
      grpc.credentials.createInsecure());
    this.sessionClient = new services.ActionServiceClient(this.postURI,
      grpc.credentials.createInsecure());
  }
}
