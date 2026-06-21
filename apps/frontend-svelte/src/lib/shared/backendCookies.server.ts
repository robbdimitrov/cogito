import type { Cookies } from "@sveltejs/kit";

const ALLOWED_COOKIES = new Set(["session", "_csrf"]);

type CookieOptions = Parameters<Cookies["set"]>[2];
type SameSite = "lax" | "strict" | "none";

export function bridgeBackendCookies(cookies: Cookies, headers: Headers): void {
  const setCookies = headers.getSetCookie();
  const fallback = headers.get("set-cookie");

  for (const header of setCookies.length > 0
    ? setCookies
    : fallback
      ? [fallback]
      : []) {
    const parsed = parseSetCookie(header);
    if (parsed && ALLOWED_COOKIES.has(parsed.name)) {
      cookies.set(parsed.name, parsed.value, parsed.options);
    }
  }
}

function parseSetCookie(
  header: string,
): { name: string; value: string; options: CookieOptions } | null {
  const [pair, ...attributes] = header.split(";").map((part) => part.trim());
  if (!pair) return null;

  const separator = pair.indexOf("=");
  if (separator <= 0) return null;

  const name = pair.slice(0, separator);
  const value = pair.slice(separator + 1);
  const options: CookieOptions = {
    path: "/",
    httpOnly: name === "session",
    secure: false,
    sameSite: "strict",
  };

  for (const attribute of attributes) {
    const [rawName, ...rawValue] = attribute.split("=");
    const attributeName = rawName?.toLowerCase();
    const attributeValue = rawValue.join("=");

    switch (attributeName) {
      case "path":
        options.path = attributeValue || "/";
        break;
      case "expires": {
        const expires = new Date(attributeValue);
        if (!Number.isNaN(expires.getTime())) options.expires = expires;
        break;
      }
      case "max-age": {
        const maxAge = Number(attributeValue);
        if (Number.isFinite(maxAge)) options.maxAge = maxAge;
        break;
      }
      case "httponly":
        options.httpOnly = true;
        break;
      case "secure":
        options.secure = true;
        break;
      case "samesite": {
        const sameSite = attributeValue.toLowerCase();
        if (isSameSite(sameSite)) options.sameSite = sameSite;
        break;
      }
    }
  }

  return { name, value, options };
}

function isSameSite(value: string): value is SameSite {
  return value === "lax" || value === "strict" || value === "none";
}
