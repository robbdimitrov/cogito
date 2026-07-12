import { describe, expect, it } from "vitest";
import { activeToken } from "./activeToken";

describe("activeToken", () => {
  it("detects mention and hashtag tokens before the caret", () => {
    expect(activeToken("hello @ali", 10)).toEqual({
      trigger: "@",
      query: "ali",
      start: 6,
      end: 10,
    });
    expect(activeToken("#topic", 6)).toEqual({
      trigger: "#",
      query: "topic",
      start: 0,
      end: 6,
    });
  });

  it("ignores tokens that are not active at the caret", () => {
    expect(activeToken("hello @ali there", 16)).toBeNull();
    expect(activeToken("email@host", 10)).toBeNull();
  });
});
