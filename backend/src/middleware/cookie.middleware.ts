import { Request, Response, NextFunction } from "express";
import { parse, serialize, SerializeOptions } from "cookie";

/**
 * Cookie options for setting secure cookies
 */
export const DEFAULT_COOKIE_OPTIONS: SerializeOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * Sets a cookie with the given name, value, and options
 */
export const setCookie = (
  res: Response,
  name: string,
  value: string,
  options: SerializeOptions = {}
) => {
  const cookieOptions = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  const cookie = serialize(name, value, cookieOptions);

  // Append the cookie to the response headers
  const existingCookies = res.getHeader("Set-Cookie") || [];
  const cookies = Array.isArray(existingCookies)
    ? [...existingCookies, cookie]
    : [existingCookies.toString(), cookie];

  res.setHeader("Set-Cookie", cookies);
};

/**
 * Clears a cookie with the given name
 */
export const clearCookie = (
  res: Response,
  name: string,
  options: SerializeOptions = {}
) => {
  const cookieOptions = {
    ...DEFAULT_COOKIE_OPTIONS,
    ...options,
    maxAge: 0,
    expires: new Date(0),
  };

  setCookie(res, name, "", cookieOptions);
};

/**
 * Middleware to parse cookies in the request
 */
export const cookieParser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const cookies = req.headers.cookie;

  if (cookies) {
    req.cookies = parse(cookies);
  } else {
    req.cookies = {};
  }

  // Add helper methods to the response object
  res.cookie = (name: string, value: string, options?: SerializeOptions) => {
    setCookie(res, name, value, options);
    return res;
  };

  res.clearCookie = (name: string, options?: SerializeOptions) => {
    clearCookie(res, name, options);
    return res;
  };

  next();
};

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      cookies: Record<string, string>;
    }

    interface Response {
      cookie(name: string, value: string, options?: SerializeOptions): Response;
      clearCookie(name: string, options?: SerializeOptions): Response;
    }
  }
}
