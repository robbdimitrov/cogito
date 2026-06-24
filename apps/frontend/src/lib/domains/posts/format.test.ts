import { describe, it, expect } from "vitest";
import { formatContent, type ContentPart } from "./format";

const links = (parts: ContentPart[]) => parts.filter((p) => p.type === "link");
const texts = (parts: ContentPart[]) =>
  parts.filter((p) => p.type === "text").map((p) => p.text);

describe("formatContent", () => {
  describe("plain text", () => {
    it("returns plain text unchanged", () => {
      expect(formatContent("Just some plain text")).toEqual([
        { type: "text", text: "Just some plain text" },
      ]);
    });

    it("returns empty text part for empty string", () => {
      expect(formatContent("")).toEqual([{ type: "text", text: "" }]);
    });
  });

  describe("hashtags", () => {
    it("links a hashtag mid-sentence", () => {
      const parts = formatContent("Hello #world today");
      expect(links(parts)).toHaveLength(1);
      expect(links(parts)[0]).toMatchObject({
        text: "#world",
        href: "/hashtags/world",
        external: false,
      });
    });

    it("lowercases the hashtag value in the href", () => {
      const parts = formatContent("Trending #React today");
      const [link] = links(parts);
      expect(link).toMatchObject({
        href: "/hashtags/react",
        text: "#React",
      });
    });

    it("links a hashtag at the very start of the string", () => {
      const parts = formatContent("#hello world");
      expect(links(parts)).toHaveLength(1);
      expect(links(parts)[0]).toMatchObject({ text: "#hello" });
      expect(texts(parts)).toEqual([" world"]);
    });

    it("does not link # inside a word", () => {
      const parts = formatContent("C# is a language");
      expect(links(parts)).toHaveLength(0);
    });
  });

  describe("mentions", () => {
    it("links a mention mid-sentence", () => {
      const parts = formatContent("Hello @user today");
      expect(links(parts)).toHaveLength(1);
      expect(links(parts)[0]).toMatchObject({
        text: "@user",
        href: "/@user",
        external: false,
      });
    });

    it("preserves mention casing in both text and href", () => {
      const parts = formatContent("cc @Admin");
      expect(links(parts)[0]).toMatchObject({
        text: "@Admin",
        href: "/@Admin",
      });
    });

    it("links a mention at the very start of the string", () => {
      const parts = formatContent("@user replied");
      expect(links(parts)).toHaveLength(1);
      expect(texts(parts)).toEqual([" replied"]);
    });

    it("does not link @ inside a word (e.g. email addresses)", () => {
      const parts = formatContent("contact user@example for info");
      expect(links(parts)).toHaveLength(0);
    });
  });

  describe("URLs", () => {
    it("links a bare URL as an external link", () => {
      const parts = formatContent("https://example.com/foo?bar=1");
      expect(parts).toEqual([
        {
          type: "link",
          text: "https://example.com/foo?bar=1",
          href: "https://example.com/foo?bar=1",
          external: true,
        },
      ]);
    });

    it("strips trailing punctuation from URLs", () => {
      const parts = formatContent(
        "Go to https://google.com. Also https://test.com,",
      );
      expect(links(parts).map((l) => l.text)).toEqual([
        "https://google.com",
        "https://test.com",
      ]);
    });
  });

  describe("mixed content", () => {
    it("handles mention, hashtag, and URL together", () => {
      const parts = formatContent(
        "Hey @alice check #news at https://example.com!",
      );
      const ls = links(parts);
      expect(ls).toHaveLength(3);
      expect(ls[0]).toMatchObject({ text: "@alice", href: "/@alice" });
      expect(ls[1]).toMatchObject({ text: "#news", href: "/hashtags/news" });
      expect(ls[2]).toMatchObject({
        text: "https://example.com",
        external: true,
      });
      expect(texts(parts).join("")).toContain("Hey ");
    });

    it("handles repeated identical tokens independently", () => {
      const parts = formatContent("#test #test #test");
      expect(links(parts)).toHaveLength(3);
    });
  });
});
