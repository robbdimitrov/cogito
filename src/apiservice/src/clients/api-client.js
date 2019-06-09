export class APIClient {
  constructor(serviceURI) {
    this.serviceURI = serviceURI;
  }

  handleError(error, rej) {
    return rej({
      code: error.getCode(),
      error: error.getError(),
      message: error.getMessage()
    });
  }
}
