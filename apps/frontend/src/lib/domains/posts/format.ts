export type ContentPart =
  | {
      type: "text";
      id: string;
      text: string;
    }
  | {
      type: "url";
      id: string;
      url: string;
    }
  | {
      type: "hashtag";
      id: string;
      tag: string;
      href: string;
    }
  | {
      type: "mention";
      id: string;
      handle: string;
      href: string;
    };

const TOKEN_PATTERN =
  /(https?:\/\/[^\s]+)|(^|[^A-Za-z0-9_])([#@])([A-Za-z0-9_]{1,50})/g;
const TRAILING_URL_PUNCTUATION = /[.,;:?!"']+$/;

export function formatContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(TOKEN_PATTERN)) {
    const matchIndex = match.index;
    const url = match[1];

    if (url !== undefined) {
      const punctuation = url.match(TRAILING_URL_PUNCTUATION)?.[0] ?? "";
      const linkUrl = punctuation ? url.slice(0, -punctuation.length) : url;

      appendText(parts, content.slice(lastIndex, matchIndex), lastIndex);
      parts.push({ type: "url", id: `url-${matchIndex}`, url: linkUrl });
      lastIndex = matchIndex + linkUrl.length;
      continue;
    }

    const fullMatch = match[0];
    const prefix = match[2] ?? "";
    const symbol = match[3];
    const value = match[4];
    if ((symbol !== "#" && symbol !== "@") || value === undefined) {
      continue;
    }

    const tokenIndex = matchIndex + prefix.length;
    appendText(parts, content.slice(lastIndex, tokenIndex), lastIndex);

    if (symbol === "#") {
      parts.push({
        type: "hashtag",
        id: `hashtag-${tokenIndex}`,
        tag: value,
        href: `/search?${new URLSearchParams({ q: `#${value.toLowerCase()}` })}`,
      });
    } else {
      parts.push({
        type: "mention",
        id: `mention-${tokenIndex}`,
        handle: value,
        href: `/@${encodeURIComponent(value)}`,
      });
    }
    lastIndex = matchIndex + fullMatch.length;
  }

  appendText(parts, content.slice(lastIndex), lastIndex);
  return parts.length > 0
    ? parts
    : [{ type: "text", id: "text-0", text: content }];
}

function appendText(parts: ContentPart[], text: string, index: number): void {
  if (text) {
    parts.push({ type: "text", id: `text-${index}`, text });
  }
}
