import { supabase } from "../config/supabase";
import {
  IAuthResponse,
  IUserCredentials,
  IUserRegistration,
} from "../interfaces/user.interface";

/**
 * Repository class for authentication operations using Supabase
 */
export class AuthRepository {
  /**
   * Register a new user
   * @param userData User registration data
   * @returns Authentication response with user and token
   */
  async register(userData: IUserRegistration): Promise<IAuthResponse> {
    // Register user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          username: userData.username,
        },
      },
    });

    if (authError) {
      throw new Error(`Registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Registration successful but user data is missing");
    }

    // Create user profile in users table
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      name: userData.username,
      email: userData.email,
      is_online: true,
    });

    if (profileError) {
      // User was created in auth but profile creation failed
      console.error("Failed to create user profile:", profileError);
      // Attempt to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    return {
      user: {
        id: authData.user.id,
        username: userData.username,
        email: userData.email,
        createdAt: new Date(authData.user.created_at || Date.now()),
        updatedAt: new Date(authData.user.updated_at || Date.now()),
      },
      token: authData.session?.access_token || "",
    };
  }

  /**
   * Login a user
   * @param credentials User credentials
   * @returns Authentication response with user and token
   */
  async login(credentials: IUserCredentials): Promise<IAuthResponse> {
    // Login with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

    if (authError) {
      throw new Error(`Login failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Login successful but user data is missing");
    }

    // Get user profile from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError) {
      console.error("Failed to retrieve user profile:", userError);
      throw new Error(`Failed to retrieve user profile: ${userError.message}`);
    }

    // Update user online status
    await supabase
      .from("users")
      .update({ is_online: true, last_active: new Date().toISOString() })
      .eq("id", authData.user.id);

    return {
      user: {
        id: authData.user.id,
        username: userData.name,
        email: userData.email,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      },
      token: authData.session?.access_token || "",
    };
  }

  /**
   * Logout a user
   * @returns True if logout was successful
   */
  async logout(): Promise<boolean> {
    const { error } = await supabase.auth.signOut();
    return !error;
  }

  /**
   * Verify a JWT token
   * @param token JWT token
   * @returns User ID if token is valid, null otherwise
   */
  async verifyToken(token: string): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user.id;
  }

  /**
   * Send password reset email
   * @param email User email
   * @returns True if email was sent successfully
   */
  async forgotPassword(email: string): Promise<boolean> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return !error;
  }

  /**
   * Reset user password
   * @param token Reset token
   * @param newPassword New password
   * @returns True if password was reset successfully
   */
  async resetPassword(newPassword: string): Promise<boolean> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return !error;
  }

  /**
   * Get current logged in user
   * @returns User data if logged in, null otherwise
   */
  async getCurrentUser(): Promise<Omit<
    IAuthResponse["user"],
    "password"
  > | null> {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    // Get user profile from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (userError) {
      console.error("Failed to retrieve user profile:", userError);
      return null;
    }

    return {
      id: data.user.id,
      username: userData.name,
      email: userData.email,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
    };
  }
}
