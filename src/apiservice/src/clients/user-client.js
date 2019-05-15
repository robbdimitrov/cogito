import * as grpc from 'grpc';

import * as services from '../genproto/thoughts_grpc_pb';
import * as messages from '../genproto/thoughts_pb';
import { APIClient } from './api-client';

export class UserClient extends APIClient {
  constructor(grpcURI) {
    super(grpcURI);

    this.userClient = new services.UserServiceClient(this.grpcURI,
      grpc.credentials.createInsecure());
    this.followClient = new services.FollowServiceClient(this.grpcURI,
      grpc.credentials.createInsecure());
  }

  // Users

  createUser(username, email, name, password) {
    let request = new messages.UserUpdates();
    request.setUsername(username);
    request.setEmail(email);
    request.setName(name);
    request.setPassword(password);

    return new Promise((res, rej) => {
      this.userClient.createUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        let user = response.getUser();
        res({
          'id': user.getId(),
          'username': user.getUsername(),
          'email': user.getEmail(),
          'name': user.getName(),
          'bio': user.getBio(),
          'date_created': user.getDateCreated()
        });
      });
    });
  }

  getUser(username, token) {
    let request = new messages.UserRequest();
    request.setUsername(username);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.getUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        let user = response.getUser();
        res({
          'id': user.getId(),
          'username': user.getUsername(),
          'email': user.getEmail(),
          'name': user.getName(),
          'bio': user.getBio(),
          'date_created': user.getDateCreated()
        });
      });
    });
  }

  updateUser(username, email, name, password, bio, oldPassword, token) {
    let request = new messages.UserUpdates();
    request.setUsername(username);
    request.setEmail(email);
    request.setName(name);
    request.setPassword(password);
    request.setBio(bio);
    request.setOldPassword(oldPassword);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.updateUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  deleteUser(username, token) {
    let request = new messages.UserRequest();
    request.setUsername(username);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.deleteUser(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  // Follows

  getFollowing(username, token, page, limit, countOnly) {
    let request = new messages.DataRequest();
    request.setUsername(username);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);
    request.setCountOnly(countOnly);

    return new Promise((res, rej) => {
      this.userClient.getFollowing(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let count = response.getCount();
        if (count !== undefined) {
          return rej({
            count
          });
        }
        let users = [];
        for (let item of response.getUsers()) {
          let user = {
            'id': item.getId(),
            'username': item.getUsername(),
            'email': item.getEmail(),
            'name': item.getName(),
            'bio': item.getBio(),
            'date_created': item.getDateCreated()
          };
          users.push(user);
        }
        res(users);
      });
    });
  }

  getFollowers(username, token, page, limit, countOnly) {
    let request = new messages.DataRequest();
    request.setUsername(username);
    request.setToken(token);
    request.setPage(page);
    request.setLimit(limit);
    request.setCountOnly(countOnly);

    return new Promise((res, rej) => {
      this.userClient.getFollowers(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let count = response.getCount();
        if (count !== undefined) {
          return rej({
            count
          });
        }
        let users = [];
        for (let item of response.getUsers()) {
          let user = {
            'id': item.getId(),
            'username': item.getUsername(),
            'email': item.getEmail(),
            'name': item.getName(),
            'bio': item.getBio(),
            'date_created': item.getDateCreated()
          };
          users.push(user);
        }
        res(users);
      });
    });
  }

  follow(username, token) {
    let request = new messages.UserRequest();
    request.setUsername(username);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.follow(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }

  unfollow(username, token) {
    let request = new messages.UserRequest();
    request.setUsername(username);
    request.setToken(token);

    return new Promise((res, rej) => {
      this.userClient.unfollow(request, (err, response) => {
        if (err) {
          return rej(err);
        }
        let error = response.getError();
        if (error !== undefined) {
          return this.handleError(error, rej);
        }
        res({'message': response.getMessage()});
      });
    });
  }
}
