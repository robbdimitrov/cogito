import { Server } from './server';

const server = new Server(3000);
server.config['AUTH_URI'] = process.env.AUTH_URI;
server.config['POST_URI'] = process.env.POST_URI;
server.config['USER_URI'] = process.env.USER_URI;
server.config['IMAGE_URI'] = process.env.IMAGE_URI;

if (!module.parent) {
  server.start();
}
