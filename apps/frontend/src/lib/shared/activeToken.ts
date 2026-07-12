export interface ActiveToken {
  trigger: "@" | "#";
  query: string;
  start: number;
  end: number;
}

const TOKEN_RE = /(?:^|\s)([@#])([A-Za-z0-9_]*)$/;

export function activeToken(text: string, caret: number): ActiveToken | null {
  const before = text.slice(0, caret);
  const match = before.match(TOKEN_RE);
  if (!match || match.index === undefined) return null;

  const prefix = match[0].startsWith(" ") ? 1 : 0;
  const start = match.index + prefix;
  return {
    trigger: match[1] as "@" | "#",
    query: match[2] ?? "",
    start,
    end: caret,
  };
}
