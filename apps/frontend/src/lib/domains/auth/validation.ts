const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface RegisterFields {
  name: string;
  username: string;
  email: string;
}

export function validateRegister(
  name: string,
  username: string,
  email: string,
  password: string,
): string | null {
  if (!name || !username || !email || !password) {
    return "All fields are required";
  }
  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH ||
    !USERNAME_PATTERN.test(username)
  ) {
    return "Username must be 3-30 characters and contain only letters, numbers, and underscores";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address";
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return "Password must be between 8 and 128 characters";
  }
  return null;
}

export function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
