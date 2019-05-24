import { APIRouter } from './api-router';

export class ImageRouter extends APIRouter {
  constructor(imageClient) {
    super();
    this.imageClient = imageClient;
  }

  connectRouter(router) {
    router.post('/', (req, res) => {
      this.imageClient.uploadImage(req, res);
    });

    router.get('/:id', (req, res) => {
      this.imageClient.getImage(req, res);
    });
  }
}
