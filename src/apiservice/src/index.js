import { Server } from './server';

const port = Number(process.env.PORT || '');
const apiRoot = process.env.API_ROOT || '';
const authURI = process.env.AUTH_URI || '';
const postURI = process.env.POST_URI || '';
const userURI = process.env.USER_URI || '';

const server = new Server(port, apiRoot, authURI, postURI, userURI);

if (!module.parent) {
  server.start();
}
