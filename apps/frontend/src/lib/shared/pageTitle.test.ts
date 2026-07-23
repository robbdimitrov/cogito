import { describe, expect, it } from "vitest";
import { pageTitle } from "./pageTitle";

describe("pageTitle", () => {
  it("returns the bare app name without a page title", () => {
    expect(pageTitle()).toBe("Cogito");
    expect(pageTitle(null)).toBe("Cogito");
  });

  it("formats page titles with the app suffix", () => {
    expect(pageTitle("Notifications")).toBe("Notifications - Cogito");
  });
});
