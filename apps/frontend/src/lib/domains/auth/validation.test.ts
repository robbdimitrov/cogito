import { describe, it, expect } from "vitest";
import { validateRegister } from "./validation";

const VALID = {
  name: "Test User",
  username: "valid_user",
  email: "test@example.com",
  password: "password1",
} as const;

describe("validateRegister", () => {
  it("returns null for fully valid input", () => {
    expect(
      validateRegister(VALID.name, VALID.username, VALID.email, VALID.password),
    ).toBeNull();
  });

  describe("required fields", () => {
    it.each([
      ["name", "", VALID.username, VALID.email, VALID.password],
      ["username", VALID.name, "", VALID.email, VALID.password],
      ["email", VALID.name, VALID.username, "", VALID.password],
      ["password", VALID.name, VALID.username, VALID.email, ""],
    ])("returns an error when %s is empty", (_field, name, user, email, pw) => {
      expect(validateRegister(name, user, email, pw)).not.toBeNull();
    });
  });

  describe("username format", () => {
    it("accepts letters, digits, and underscores", () => {
      expect(
        validateRegister(VALID.name, "user_123", VALID.email, VALID.password),
      ).toBeNull();
    });

    it("accepts an all-digit username", () => {
      expect(
        validateRegister(VALID.name, "12345", VALID.email, VALID.password),
      ).toBeNull();
    });

    it("rejects a username with a slash", () => {
      expect(
        validateRegister(VALID.name, "bad/user", VALID.email, VALID.password),
      ).toBe(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
      );
    });

    it("rejects a username with a space", () => {
      expect(
        validateRegister(VALID.name, "bad user", VALID.email, VALID.password),
      ).toBe(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
      );
    });

    it("rejects a username shorter than 3 characters", () => {
      expect(
        validateRegister(VALID.name, "ab", VALID.email, VALID.password),
      ).toBe(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
      );
    });

    it("rejects a username longer than 30 characters", () => {
      expect(
        validateRegister(VALID.name, "a".repeat(31), VALID.email, VALID.password),
      ).toBe(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
      );
    });

    it("accepts a username of exactly 30 characters", () => {
      expect(
        validateRegister(VALID.name, "a".repeat(30), VALID.email, VALID.password),
      ).toBeNull();
    });
  });

  describe("password length", () => {
    it("rejects passwords shorter than 8 characters", () => {
      expect(
        validateRegister(VALID.name, VALID.username, VALID.email, "short"),
      ).toBe("Password must be between 8 and 128 characters");
    });

    it("accepts a password of exactly 8 characters", () => {
      expect(
        validateRegister(VALID.name, VALID.username, VALID.email, "exactly8"),
      ).toBeNull();
    });

    it("rejects passwords longer than 128 characters", () => {
      expect(
        validateRegister(VALID.name, VALID.username, VALID.email, "a".repeat(129)),
      ).toBe("Password must be between 8 and 128 characters");
    });

    it("accepts a password of exactly 128 characters", () => {
      expect(
        validateRegister(VALID.name, VALID.username, VALID.email, "a".repeat(128)),
      ).toBeNull();
    });
  });
});
