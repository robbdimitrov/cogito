import { describe, it, expect } from "vitest";
import { imageUrl } from "./imageUrl";

describe("imageUrl", () => {
  it("returns the full-resolution path when no size is given", () => {
    expect(imageUrl("abc123.jpg")).toBe("/uploads/abc123.jpg");
  });

  it("appends the size query param for a thumbnail request", () => {
    expect(imageUrl("abc123.jpg", "thumb")).toBe(
      "/uploads/abc123.jpg?size=thumb",
    );
  });
});
