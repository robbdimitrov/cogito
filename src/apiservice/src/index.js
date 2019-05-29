import { Server } from './server';

const port = process.env.PORT;
const authURI = process.env.AUTH_SERVICE_ADDR;
const userURI = process.env.USER_SERVICE_ADDR;
const postURI = process.env.POST_SERVICE_ADDR;
const imageURI = process.env.IMAGE_SERVICE_ADDR;

const server = new Server(port, authURI, userURI, postURI, imageURI);

if (!module.parent) {
  server.start();
}
