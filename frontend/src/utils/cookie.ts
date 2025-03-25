/**
 * Cookie utility functions for managing browser cookies
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

/**
 * Set a cookie with the given name and value
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export const setCookie = (
  name: string,
  value: string,
  options: CookieOptions = {}
) => {
  const {
    days = 7,
    path = "/",
    domain,
    secure = window.location.protocol === "https:",
    sameSite = "lax",
  } = options;

  console.log("Setting cookie:", name, value, options);
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${date.toUTCString()}`;
  }

  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += "; secure";
  }

  cookieString += `; samesite=${sameSite}`;

  document.cookie = cookieString;
};

/**
 * Get a cookie by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  const nameEQ = encodeURIComponent(name) + "=";
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }

  return null;
};

/**
 * Remove a cookie by name
 * @param name - Cookie name
 * @param options - Cookie options (path and domain must match the ones used when setting)
 */
export const removeCookie = (
  name: string,
  options: Pick<CookieOptions, "path" | "domain"> = {}
) => {
  console.log("Removing cookie:", name);
  const { path = "/", domain } = options;
  setCookie(name, "", { days: -1, path, domain, secure: true });
};
