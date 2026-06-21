import type { Cookies } from "@sveltejs/kit";

type SameSite = "lax" | "strict" | "none";

export function applySetCookies(cookies: Cookies, setCookies: string[]): void {
  for (const header of setCookies) {
    const [pair, ...attributes] = header.split(";").map((part) => part.trim());
    if (!pair) continue;

    const separator = pair.indexOf("=");
    if (separator <= 0) continue;

    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const options: Parameters<Cookies["set"]>[2] = {
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    };

    for (const attribute of attributes) {
      const [rawName, ...rawValue] = attribute.split("=");
      const attributeName = rawName?.toLowerCase();
      const attributeValue = rawValue.join("=");

      switch (attributeName) {
        case "path":
          options.path = attributeValue || "/";
          break;
        case "domain":
          if (attributeValue) options.domain = attributeValue;
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

    cookies.set(name, value, options);
  }
}

function isSameSite(value: string): value is SameSite {
  return value === "lax" || value === "strict" || value === "none";
}
