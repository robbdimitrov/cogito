import { describe, it, expect } from "vitest";
import { formatContent, type ContentPart } from "./format";

const texts = (parts: ContentPart[]) =>
  parts.filter((p) => p.type === "text").map((p) => p.text);
const hashtags = (parts: ContentPart[]) =>
  parts.filter((p) => p.type === "hashtag");
const mentions = (parts: ContentPart[]) =>
  parts.filter((p) => p.type === "mention");
const urls = (parts: ContentPart[]) => parts.filter((p) => p.type === "url");

describe("formatContent", () => {
  describe("plain text", () => {
    it("returns plain text unchanged", () => {
      expect(formatContent("Just some plain text")).toEqual([
        { type: "text", id: "text-0", text: "Just some plain text" },
      ]);
    });

    it("returns empty text part for empty string", () => {
      expect(formatContent("")).toEqual([
        { type: "text", id: "text-0", text: "" },
      ]);
    });
  });

  describe("hashtags", () => {
    it("links a hashtag mid-sentence", () => {
      const parts = formatContent("Hello #world today");
      expect(hashtags(parts)).toHaveLength(1);
      expect(hashtags(parts)[0]).toMatchObject({
        tag: "world",
        href: "/hashtags/world",
      });
    });

    it("lowercases the hashtag value in the href", () => {
      const parts = formatContent("Trending #React today");
      const [tag] = hashtags(parts);
      expect(tag).toMatchObject({
        href: "/hashtags/react",
        tag: "React",
      });
    });

    it("links a hashtag at the very start of the string", () => {
      const parts = formatContent("#hello world");
      expect(hashtags(parts)).toHaveLength(1);
      expect(hashtags(parts)[0]).toMatchObject({ tag: "hello" });
      expect(texts(parts)).toEqual([" world"]);
    });

    it("does not link # inside a word", () => {
      const parts = formatContent("C# is a language");
      expect(hashtags(parts)).toHaveLength(0);
    });
  });

  describe("mentions", () => {
    it("links a mention mid-sentence", () => {
      const parts = formatContent("Hello @user today");
      expect(mentions(parts)).toHaveLength(1);
      expect(mentions(parts)[0]).toMatchObject({
        handle: "user",
        href: "/@user",
      });
    });

    it("preserves mention casing in both handle and href", () => {
      const parts = formatContent("cc @Admin");
      expect(mentions(parts)[0]).toMatchObject({
        handle: "Admin",
        href: "/@Admin",
      });
    });

    it("links a mention at the very start of the string", () => {
      const parts = formatContent("@user replied");
      expect(mentions(parts)).toHaveLength(1);
      expect(texts(parts)).toEqual([" replied"]);
    });

    it("does not link @ inside a word (e.g. email addresses)", () => {
      const parts = formatContent("contact user@example for info");
      expect(mentions(parts)).toHaveLength(0);
    });
  });

  describe("URLs", () => {
    it("links a bare URL as an external link", () => {
      const parts = formatContent("https://example.com/foo?bar=1");
      expect(parts).toEqual([
        {
          type: "url",
          id: "url-0",
          url: "https://example.com/foo?bar=1",
        },
      ]);
    });

    it("strips trailing punctuation from URLs", () => {
      const parts = formatContent(
        "Go to https://google.com. Also https://test.com,",
      );
      expect(urls(parts).map((l) => l.url)).toEqual([
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
      expect(mentions(parts)).toHaveLength(1);
      expect(hashtags(parts)).toHaveLength(1);
      expect(urls(parts)).toHaveLength(1);
      expect(mentions(parts)[0]).toMatchObject({
        handle: "alice",
        href: "/@alice",
      });
      expect(hashtags(parts)[0]).toMatchObject({
        tag: "news",
        href: "/hashtags/news",
      });
      expect(urls(parts)[0]).toMatchObject({
        url: "https://example.com",
      });
      expect(texts(parts).join("")).toContain("Hey ");
    });

    it("handles repeated identical tokens independently", () => {
      const parts = formatContent("#test #test #test");
      expect(hashtags(parts)).toHaveLength(3);
    });

    it("gives every token a unique, stable id", () => {
      const parts = formatContent("#test #test @user https://example.com");
      const ids = parts.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
