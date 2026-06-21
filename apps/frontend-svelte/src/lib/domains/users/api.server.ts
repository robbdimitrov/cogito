import type { User } from "./model";
import {
  apiRequest,
  jsonRequest,
  type ServerFetch,
} from "$lib/shared/transport.server";

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SEARCH_LIMIT = 5;

interface Identifier {
  id: number;
}

interface UserPage {
  items: User[];
}

export interface UpdateUserInput {
  name: string;
  username: string;
  email: string;
  bio: string;
  profilePhotoKey?: string;
  coverPhotoKey?: string;
}

export function createUser(
  fetch: ServerFetch,
  name: string,
  username: string,
  email: string,
  password: string,
): Promise<Identifier> {
  return apiRequest(
    fetch,
    "/api/users",
    jsonRequest("POST", { name, username, email, password }),
  );
}

export function updateUser(
  fetch: ServerFetch,
  userID: string | number,
  input: UpdateUserInput,
): Promise<void> {
  return apiRequest(fetch, `/api/users/${userID}`, jsonRequest("PUT", input));
}

export function updatePassword(
  fetch: ServerFetch,
  userID: string | number,
  password: string,
  oldPassword: string,
): Promise<void> {
  return apiRequest(
    fetch,
    `/api/users/${userID}`,
    jsonRequest("PUT", { password, oldPassword }),
  );
}

export function getUser(
  fetch: ServerFetch,
  userID: string | number,
): Promise<User> {
  return apiRequest(fetch, `/api/users/${userID}`);
}

export function getByUsername(
  fetch: ServerFetch,
  username: string,
): Promise<User> {
  const query = new URLSearchParams({ username });
  return apiRequest(fetch, `/api/users?${query}`);
}

export function searchUsers(
  fetch: ServerFetch,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<UserPage> {
  const search = new URLSearchParams({ q: query, limit: String(limit) });
  return apiRequest(fetch, `/api/users/search?${search}`);
}

export function getFollowing(
  fetch: ServerFetch,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<UserPage> {
  return getUserPage(fetch, userID, "following", page, limit);
}

export function getFollowers(
  fetch: ServerFetch,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<UserPage> {
  return getUserPage(fetch, userID, "followers", page, limit);
}

export function follow(
  fetch: ServerFetch,
  userID: string | number,
): Promise<void> {
  return apiRequest(fetch, `/api/users/${userID}/following`, {
    method: "POST",
  });
}

export function unfollow(
  fetch: ServerFetch,
  userID: string | number,
): Promise<void> {
  return apiRequest(fetch, `/api/users/${userID}/following`, {
    method: "DELETE",
  });
}

function getUserPage(
  fetch: ServerFetch,
  userID: string | number,
  relationship: "following" | "followers",
  page: number,
  limit: number,
): Promise<UserPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest(fetch, `/api/users/${userID}/${relationship}?${query}`);
}
