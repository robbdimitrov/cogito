export type ContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "link";
      text: string;
      href: string;
      external: boolean;
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
      const linkText = punctuation ? url.slice(0, -punctuation.length) : url;

      appendText(parts, content.slice(lastIndex, matchIndex));
      parts.push({
        type: "link",
        text: linkText,
        href: linkText,
        external: true,
      });
      lastIndex = matchIndex + linkText.length;
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
    appendText(parts, content.slice(lastIndex, tokenIndex));

    parts.push({
      type: "link",
      text: `${symbol}${value}`,
      href:
        symbol === "#"
          ? `/hashtags/${encodeURIComponent(value.toLowerCase())}`
          : `/@${encodeURIComponent(value)}`,
      external: false,
    });
    lastIndex = matchIndex + fullMatch.length;
  }

  appendText(parts, content.slice(lastIndex));
  return parts.length > 0 ? parts : [{ type: "text", text: content }];
}

function appendText(parts: ContentPart[], text: string): void {
  if (text) {
    parts.push({ type: "text", text });
  }
}
