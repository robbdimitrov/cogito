import type { User } from "./model";
import type { ApiClient } from "$lib/server/api/client";
import { unwrap } from "$lib/server/api/http";

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

export async function createUser(
  api: ApiClient,
  name: string,
  username: string,
  email: string,
  password: string,
): Promise<Identifier> {
  const res = await api("/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, username, email, password }),
  });
  const unwrapped = await unwrap<Identifier>(res);
  return unwrapped!;
}

export async function updateUser(
  api: ApiClient,
  userID: string | number,
  input: UpdateUserInput,
): Promise<void> {
  const res = await api(`/users/${userID}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await unwrap<null>(res);
}

export async function updatePassword(
  api: ApiClient,
  userID: string | number,
  password: string,
  oldPassword: string,
): Promise<void> {
  const res = await api(`/users/${userID}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, oldPassword }),
  });
  await unwrap<null>(res);
}

export async function getUser(api: ApiClient, username: string): Promise<User> {
  const res = await api(`/users/${encodeURIComponent(username)}`);
  const unwrapped = await unwrap<User>(res);
  return unwrapped!;
}

export async function getUserById(
  api: ApiClient,
  id: string | number,
): Promise<User> {
  const res = await api(`/users/${id}`);
  const unwrapped = await unwrap<User>(res);
  return unwrapped!;
}

export async function searchUsers(
  api: ApiClient,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<UserPage> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  const res = await api(`/users/search?${params}`);
  const unwrapped = await unwrap<UserPage>(res);
  return unwrapped ?? { items: [] };
}

export async function getFollowing(
  api: ApiClient,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<UserPage> {
  return getUserPage(api, userID, "following", page, limit);
}

export async function getFollowers(
  api: ApiClient,
  userID: string | number,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): Promise<UserPage> {
  return getUserPage(api, userID, "followers", page, limit);
}

export async function follow(
  api: ApiClient,
  userID: string | number,
): Promise<void> {
  const res = await api(`/users/${userID}/following`, {
    method: "POST",
  });
  await unwrap<null>(res);
}

export async function unfollow(
  api: ApiClient,
  userID: string | number,
): Promise<void> {
  const res = await api(`/users/${userID}/following`, {
    method: "DELETE",
  });
  await unwrap<null>(res);
}

async function getUserPage(
  api: ApiClient,
  userID: string | number,
  relationship: "following" | "followers",
  page: number,
  limit: number,
): Promise<UserPage> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await api(`/users/${userID}/${relationship}?${query}`);
  const unwrapped = await unwrap<UserPage>(res);
  return unwrapped ?? { items: [] };
}
