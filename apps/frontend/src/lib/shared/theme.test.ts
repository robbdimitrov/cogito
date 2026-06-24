import { describe, it, expect } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("returns system for undefined", () => {
    expect(parseTheme(undefined)).toBe("system");
  });

  it("returns system for an unrecognised value", () => {
    expect(parseTheme("unknown")).toBe("system");
    expect(parseTheme("")).toBe("system");
  });

  it.each(["light", "dark", "system"] as const)("round-trips %s", (mode) => {
    expect(parseTheme(mode)).toBe(mode);
  });
});
