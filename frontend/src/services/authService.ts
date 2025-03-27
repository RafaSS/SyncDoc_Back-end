import { supabase } from "../config/supabase";
import type { AuthUser, AuthSession } from "../types";
import { setCookie, removeCookie } from "../utils/cookie";

export const AuthService = {
  /**
   * Sign in a user with email and password
   */
  async login(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw this.handleError(error);
    if (!data?.user) throw new Error("Login failed: No user returned");

    // Set auth cookie with access token, not user ID
    if (data.session?.access_token) {
      this.setAuthCookie(data.session.access_token);
    }

    return data.user as AuthUser;
  },

  /**
   * Register a new user with email and password
   */
  async signup(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw this.handleError(error);
    if (!data?.user) throw new Error("Signup failed: No user returned");

    // Set auth cookie with access token, not user ID
    if (data.session?.access_token) {
      this.setAuthCookie(data.session.access_token);
    }

    return data.user as AuthUser;
  },

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    // Always clear cookie regardless of error
    this.clearAuthCookie();

    if (error) throw this.handleError(error);
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await supabase.auth.getSession();

      // console.trace("Session data:", data);

      if (error) {
        console.error("Session error:", error);
        return null;
      }

      // If session exists, ensure cookie is set with access token
      if (data.session?.access_token) {
        this.setAuthCookie(data.session.access_token);
        return data.session as AuthSession;
      }

      return null;
    } catch (err) {
      console.error("Unexpected error getting session:", err);
      return null;
    }
  },

  /**
   * Get the current user
   */
  async getUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("User error:", error.message);
        return null;
      }

      // If user exists, ensure cookie is set with access token
      const session = await this.getSession();
      if (session?.access_token) {
        this.setAuthCookie(session.access_token);
        return data.user as AuthUser;
      }

      return data.user as AuthUser;
    } catch (err) {
      console.error("Unexpected error getting user:", err);
      return null;
    }
  },

  /**
   * Set auth cookie
   */
  setAuthCookie(token: string): void {
    setCookie("auth_token", token, {
      days: 7,
      secure: window.location.protocol === "https:",
      sameSite: "lax",
    });
  },

  /**
   * Clear auth cookie
   */
  clearAuthCookie(): void {
    removeCookie("auth_token");
  },

  /**
   * Handle Supabase errors consistently
   */
  handleError(error: any): Error {
    console.error("Auth error:", error);
    return new Error(error.message || "Authentication failed");
  },
};
