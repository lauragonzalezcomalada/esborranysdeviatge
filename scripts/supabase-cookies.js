import { parseSetCookie, serialize } from "cookie";

function cookieKey(name, options = {}) {
  return `${name}|${options.domain || ""}|${options.path || "/"}`;
}

function currentCookies(response) {
  const header = response.getHeader("set-cookie");
  if (!header) return [];
  return (Array.isArray(header) ? header : [header]).map(String);
}

// Nitro's request event comes from h3 1, where event.res is the Node response.
// @nuxtjs/supabase 2.1.0 calls h3 2 setCookie, which reads event.res.headers.
export function setCookies(event, cookies, headers = {}) {
  const response = event?.node?.res;
  if (!response || response.headersSent || response.writableEnded) {
    return;
  }
  for (const { name, value, options } of cookies) {
    if (response.headersSent || response.writableEnded) break;
    const serializeOptions = { path: "/", ...options };
    const next = serialize(name, value ?? "", serializeOptions);
    const nextKey = cookieKey(name, serializeOptions);
    const kept = currentCookies(response).filter((cookie) => {
      const parsed = parseSetCookie(cookie);
      if (!parsed?.name) return !cookie.startsWith(`${name}=`);
      return cookieKey(parsed.name, parsed) !== nextKey;
    });
    response.setHeader("set-cookie", [...kept, next]);
  }
  for (const [key, value] of Object.entries(headers)) {
    if (response.headersSent || response.writableEnded) break;
    response.setHeader(key, value);
  }
}
