const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface SignupFields {
  name: string;
  username: string;
  email: string;
}

export function validateSignup(
  name: string,
  username: string,
  email: string,
  password: string,
): string | null {
  if (!name || !username || !email || !password) {
    return "All fields are required";
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export function formString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
