// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var thoughts_pb = require('./thoughts_pb.js');

function serialize_thoughts_AuthRequest(arg) {
  if (!(arg instanceof thoughts_pb.AuthRequest)) {
    throw new Error('Expected argument of type thoughts.AuthRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_AuthRequest(buffer_arg) {
  return thoughts_pb.AuthRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_AuthStatus(arg) {
  if (!(arg instanceof thoughts_pb.AuthStatus)) {
    throw new Error('Expected argument of type thoughts.AuthStatus');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_AuthStatus(buffer_arg) {
  return thoughts_pb.AuthStatus.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Credentials(arg) {
  if (!(arg instanceof thoughts_pb.Credentials)) {
    throw new Error('Expected argument of type thoughts.Credentials');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Credentials(buffer_arg) {
  return thoughts_pb.Credentials.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_DataRequest(arg) {
  if (!(arg instanceof thoughts_pb.DataRequest)) {
    throw new Error('Expected argument of type thoughts.DataRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_DataRequest(buffer_arg) {
  return thoughts_pb.DataRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Identifiers(arg) {
  if (!(arg instanceof thoughts_pb.Identifiers)) {
    throw new Error('Expected argument of type thoughts.Identifiers');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Identifiers(buffer_arg) {
  return thoughts_pb.Identifiers.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_PostRequest(arg) {
  if (!(arg instanceof thoughts_pb.PostRequest)) {
    throw new Error('Expected argument of type thoughts.PostRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_PostRequest(buffer_arg) {
  return thoughts_pb.PostRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_PostStatus(arg) {
  if (!(arg instanceof thoughts_pb.PostStatus)) {
    throw new Error('Expected argument of type thoughts.PostStatus');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_PostStatus(buffer_arg) {
  return thoughts_pb.PostStatus.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_PostUpdates(arg) {
  if (!(arg instanceof thoughts_pb.PostUpdates)) {
    throw new Error('Expected argument of type thoughts.PostUpdates');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_PostUpdates(buffer_arg) {
  return thoughts_pb.PostUpdates.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Posts(arg) {
  if (!(arg instanceof thoughts_pb.Posts)) {
    throw new Error('Expected argument of type thoughts.Posts');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Posts(buffer_arg) {
  return thoughts_pb.Posts.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_SessionRequest(arg) {
  if (!(arg instanceof thoughts_pb.SessionRequest)) {
    throw new Error('Expected argument of type thoughts.SessionRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_SessionRequest(buffer_arg) {
  return thoughts_pb.SessionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Sessions(arg) {
  if (!(arg instanceof thoughts_pb.Sessions)) {
    throw new Error('Expected argument of type thoughts.Sessions');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Sessions(buffer_arg) {
  return thoughts_pb.Sessions.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Status(arg) {
  if (!(arg instanceof thoughts_pb.Status)) {
    throw new Error('Expected argument of type thoughts.Status');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Status(buffer_arg) {
  return thoughts_pb.Status.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_UserRequest(arg) {
  if (!(arg instanceof thoughts_pb.UserRequest)) {
    throw new Error('Expected argument of type thoughts.UserRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_UserRequest(buffer_arg) {
  return thoughts_pb.UserRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_UserStatus(arg) {
  if (!(arg instanceof thoughts_pb.UserStatus)) {
    throw new Error('Expected argument of type thoughts.UserStatus');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_UserStatus(buffer_arg) {
  return thoughts_pb.UserStatus.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_UserUpdates(arg) {
  if (!(arg instanceof thoughts_pb.UserUpdates)) {
    throw new Error('Expected argument of type thoughts.UserUpdates');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_UserUpdates(buffer_arg) {
  return thoughts_pb.UserUpdates.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_thoughts_Users(arg) {
  if (!(arg instanceof thoughts_pb.Users)) {
    throw new Error('Expected argument of type thoughts.Users');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_thoughts_Users(buffer_arg) {
  return thoughts_pb.Users.deserializeBinary(new Uint8Array(buffer_arg));
}


// *
// Services
//
var UserServiceService = exports.UserServiceService = {
  createUser: {
    path: '/thoughts.UserService/CreateUser',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserUpdates,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_UserUpdates,
    requestDeserialize: deserialize_thoughts_UserUpdates,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  getUser: {
    path: '/thoughts.UserService/GetUser',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.UserStatus,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_UserStatus,
    responseDeserialize: deserialize_thoughts_UserStatus,
  },
  updateUser: {
    path: '/thoughts.UserService/UpdateUser',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserUpdates,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_UserUpdates,
    requestDeserialize: deserialize_thoughts_UserUpdates,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  deleteUser: {
    path: '/thoughts.UserService/DeleteUser',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.UserServiceClient = grpc.makeGenericClientConstructor(UserServiceService);
var FollowServiceService = exports.FollowServiceService = {
  getFollowing: {
    path: '/thoughts.FollowService/GetFollowing',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.DataRequest,
    responseType: thoughts_pb.Users,
    requestSerialize: serialize_thoughts_DataRequest,
    requestDeserialize: deserialize_thoughts_DataRequest,
    responseSerialize: serialize_thoughts_Users,
    responseDeserialize: deserialize_thoughts_Users,
  },
  getFollowingIds: {
    path: '/thoughts.FollowService/GetFollowingIds',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.Identifiers,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_Identifiers,
    responseDeserialize: deserialize_thoughts_Identifiers,
  },
  getFollowers: {
    path: '/thoughts.FollowService/GetFollowers',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.DataRequest,
    responseType: thoughts_pb.Users,
    requestSerialize: serialize_thoughts_DataRequest,
    requestDeserialize: deserialize_thoughts_DataRequest,
    responseSerialize: serialize_thoughts_Users,
    responseDeserialize: deserialize_thoughts_Users,
  },
  getFollowersIds: {
    path: '/thoughts.FollowService/GetFollowersIds',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.Identifiers,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_Identifiers,
    responseDeserialize: deserialize_thoughts_Identifiers,
  },
  follow: {
    path: '/thoughts.FollowService/Follow',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  unfollow: {
    path: '/thoughts.FollowService/Unfollow',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.UserRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_UserRequest,
    requestDeserialize: deserialize_thoughts_UserRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.FollowServiceClient = grpc.makeGenericClientConstructor(FollowServiceService);
var AuthServiceService = exports.AuthServiceService = {
  login: {
    path: '/thoughts.AuthService/Login',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.Credentials,
    responseType: thoughts_pb.AuthStatus,
    requestSerialize: serialize_thoughts_Credentials,
    requestDeserialize: deserialize_thoughts_Credentials,
    responseSerialize: serialize_thoughts_AuthStatus,
    responseDeserialize: deserialize_thoughts_AuthStatus,
  },
  refresh: {
    path: '/thoughts.AuthService/Refresh',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.AuthRequest,
    responseType: thoughts_pb.AuthStatus,
    requestSerialize: serialize_thoughts_AuthRequest,
    requestDeserialize: deserialize_thoughts_AuthRequest,
    responseSerialize: serialize_thoughts_AuthStatus,
    responseDeserialize: deserialize_thoughts_AuthStatus,
  },
  validate: {
    path: '/thoughts.AuthService/Validate',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.AuthRequest,
    responseType: thoughts_pb.AuthStatus,
    requestSerialize: serialize_thoughts_AuthRequest,
    requestDeserialize: deserialize_thoughts_AuthRequest,
    responseSerialize: serialize_thoughts_AuthStatus,
    responseDeserialize: deserialize_thoughts_AuthStatus,
  },
  validatePassword: {
    path: '/thoughts.AuthService/ValidatePassword',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.Credentials,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_Credentials,
    requestDeserialize: deserialize_thoughts_Credentials,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.AuthServiceClient = grpc.makeGenericClientConstructor(AuthServiceService);
var SessionServiceService = exports.SessionServiceService = {
  getSessions: {
    path: '/thoughts.SessionService/GetSessions',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.AuthRequest,
    responseType: thoughts_pb.Sessions,
    requestSerialize: serialize_thoughts_AuthRequest,
    requestDeserialize: deserialize_thoughts_AuthRequest,
    responseSerialize: serialize_thoughts_Sessions,
    responseDeserialize: deserialize_thoughts_Sessions,
  },
  deleteSession: {
    path: '/thoughts.SessionService/DeleteSession',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.SessionRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_SessionRequest,
    requestDeserialize: deserialize_thoughts_SessionRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.SessionServiceClient = grpc.makeGenericClientConstructor(SessionServiceService);
var PostServiceService = exports.PostServiceService = {
  createPost: {
    path: '/thoughts.PostService/CreatePost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostUpdates,
    responseType: thoughts_pb.PostStatus,
    requestSerialize: serialize_thoughts_PostUpdates,
    requestDeserialize: deserialize_thoughts_PostUpdates,
    responseSerialize: serialize_thoughts_PostStatus,
    responseDeserialize: deserialize_thoughts_PostStatus,
  },
  getPost: {
    path: '/thoughts.PostService/GetPost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.PostStatus,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_PostStatus,
    responseDeserialize: deserialize_thoughts_PostStatus,
  },
  getFeed: {
    path: '/thoughts.PostService/GetFeed',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.DataRequest,
    responseType: thoughts_pb.Posts,
    requestSerialize: serialize_thoughts_DataRequest,
    requestDeserialize: deserialize_thoughts_DataRequest,
    responseSerialize: serialize_thoughts_Posts,
    responseDeserialize: deserialize_thoughts_Posts,
  },
  getPosts: {
    path: '/thoughts.PostService/GetPosts',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.DataRequest,
    responseType: thoughts_pb.Posts,
    requestSerialize: serialize_thoughts_DataRequest,
    requestDeserialize: deserialize_thoughts_DataRequest,
    responseSerialize: serialize_thoughts_Posts,
    responseDeserialize: deserialize_thoughts_Posts,
  },
  getLikedPosts: {
    path: '/thoughts.PostService/GetLikedPosts',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.DataRequest,
    responseType: thoughts_pb.Posts,
    requestSerialize: serialize_thoughts_DataRequest,
    requestDeserialize: deserialize_thoughts_DataRequest,
    responseSerialize: serialize_thoughts_Posts,
    responseDeserialize: deserialize_thoughts_Posts,
  },
  deletePost: {
    path: '/thoughts.PostService/DeletePost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.PostServiceClient = grpc.makeGenericClientConstructor(PostServiceService);
var ActionServiceService = exports.ActionServiceService = {
  likePost: {
    path: '/thoughts.ActionService/LikePost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  unlikePost: {
    path: '/thoughts.ActionService/UnlikePost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  retweetPost: {
    path: '/thoughts.ActionService/RetweetPost',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
  removeRetweet: {
    path: '/thoughts.ActionService/RemoveRetweet',
    requestStream: false,
    responseStream: false,
    requestType: thoughts_pb.PostRequest,
    responseType: thoughts_pb.Status,
    requestSerialize: serialize_thoughts_PostRequest,
    requestDeserialize: deserialize_thoughts_PostRequest,
    responseSerialize: serialize_thoughts_Status,
    responseDeserialize: deserialize_thoughts_Status,
  },
};

exports.ActionServiceClient = grpc.makeGenericClientConstructor(ActionServiceService);
