import { supabase, TABLES, DEFAULT_OPTIONS } from "../config/supabase";

/**
 * Repository class for user operations using Supabase
 */
export class UserRepository {
  /**
   * Get user by ID
   * @param userId User ID
   * @returns User data or null if not found
   */
  async getUserById(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Error fetching user: ${error.message}`);
    }

    return data;
  }

  /**
   * Create or update a user
   * @param userData User data to upsert
   * @returns The created/updated user
   */
  async upsertUser(userData: any): Promise<any> {
    const { id, ...userDataWithoutId } = userData;

    // Always update the updated_at timestamp
    const updatedData = {
      ...userDataWithoutId,
      updated_at: new Date().toISOString(),
    };

    // If no ID provided, create a new user
    if (!id) {
      updatedData.created_at = new Date().toISOString();

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .insert(updatedData)
        .select("*")
        .single();

      if (error) throw new Error(`Error creating user: ${error.message}`);
      return data;
    }

    // Otherwise, update existing user
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updatedData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(`Error updating user: ${error.message}`);
    return data;
  }

  /**
   * Find users by email or name
   * @param searchTerm Search term
   * @param options Query options for pagination
   * @returns List of matching users
   */
  async findUsers(
    searchTerm: string,
    options = DEFAULT_OPTIONS
  ): Promise<any[]> {
    // Build the query, searching for partial matches in name or email
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select("*")
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .range(
        (options.page - 1) * options.limit,
        options.page * options.limit - 1
      );

    if (error) throw new Error(`Error searching for users: ${error.message}`);
    return data;
  }

  /**
   * Get users by their IDs
   * @param userIds Array of user IDs
   * @returns List of users
   */
  async getUsersByIds(userIds: string[]): Promise<any[]> {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select("*")
      .in("id", userIds);

    if (error) throw new Error(`Error fetching users by IDs: ${error.message}`);
    return data;
  }

  /**
   * Update user online status
   * @param userId User ID
   * @param isOnline Whether the user is online
   * @returns Updated user
   */
  async updateUserStatus(userId: string, isOnline: boolean): Promise<any> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        is_online: isOnline,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error) throw new Error(`Error updating user status: ${error.message}`);
    return data;
  }
}
