export class APIClient {
  constructor(grpcURI) {
    this.grpcURI = grpcURI;
  }

  handleError(error, rej) {
    return rej({
      'code': error.getCode(),
      'error': error.getError(),
      'message': error.getMessage()
    });
  }
}
