import { Server } from './server';

const server = new Server(process.env.PORT);
server.config['AUTH_URI'] = process.env.AUTH_SERVICE_ADDR;
server.config['POST_URI'] = process.env.POST_SERVICE_ADDR;
server.config['USER_URI'] = process.env.USER_SERVICE_ADDR;
server.config['IMAGE_URI'] = process.env.IMAGE_SERVICE_ADDR;

if (!module.parent) {
  server.start();
}
