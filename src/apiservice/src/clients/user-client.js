import * as grpc from 'grpc';

import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';
import { APIClient } from './api-client';
import { itemToUser, itemsToUsers } from '../utils';

export class UserClient extends APIClient {
  constructor(serviceURI) {
    super(serviceURI);

    this.userClient = new services.UserServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
    this.followClient = new services.FollowServiceClient(this.serviceURI,
      grpc.credentials.createInsecure());
  }

  // Users

  createUser(username, email, name, password) {
    const request = new messages.UserUpdates();
    request.setUsername(username);
    request.setEmail(email);
    request.setName(name);
    request.setPassword(password);

    return new Promise((res, rej) => {
      this.userClient.createUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  getUser(userId, username, token) {
    const request = new messages.UserRequest();
    request.setToken(token);
    if (userId) {
      request.setUserId(userId);
    } else {
      request.setUsername(username);
    }

    return new Promise((res, rej) => {
      this.userClient.getUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        const user = itemToUser(response.getUser());
        res({ user });
      });
    });
  }

  updateUser(username, email, name, bio, avatar, token) {
    const request = new messages.UserUpdates();
    request.setUsername(username);
    request.setEmail(email);
    request.setName(name);
    request.setBio(bio);
    request.setAvatar(avatar);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.updateUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  updatePassword(password, oldPassword, token) {
    const request = new messages.UserUpdates();
    request.setPassword(password);
    request.setOldPassword(oldPassword);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.updatePassword(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  deleteUser(userId, token) {
    const request = new messages.UserRequest();
    request.setUserId(userId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.deleteUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  // Follows

  getFollowing(userId, token, page, limit) {
    const request = new messages.DataRequest();
    request.setUserId(userId);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);

    return new Promise((res, rej) => {
      this.followClient.getFollowing(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const users = itemsToUsers(response.getUsers());
        res({ users });
      });
    });
  }

  getFollowingIds(userId, token) {
    const request = new messages.UserRequest();
    request.setUserId(userId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.followClient.getFollowingIds(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const users = response.getIdsList();
        res({ users });
      });
    });
  }

  getFollowers(userId, token, page, limit) {
    const request = new messages.DataRequest();
    request.setUserId(userId);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);

    return new Promise((res, rej) => {
      this.followClient.getFollowers(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const users = itemsToUsers(response.getUsers());
        res({ users });
      });
    });
  }

  getFollowersIds(userId, token) {
    const request = new messages.UserRequest();
    request.setUserId(userId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.followClient.getFollowersIds(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const users = response.getIdsList();
        res({ users });
      });
    });
  }

  followUser(userId, token) {
    const request = new messages.UserRequest();
    request.setUserId(userId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.followClient.followUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }

  unfollowUser(userId, token) {
    const request = new messages.UserRequest();
    request.setUserId(userId);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.followClient.unfollowUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        const error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({ message: response.getMessage() });
      });
    });
  }
}
