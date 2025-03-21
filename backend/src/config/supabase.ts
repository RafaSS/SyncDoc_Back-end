import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Table names for better maintainability
 */
export const TABLES = {
  DOCUMENTS: "documents",
  DOCUMENT_CHANGES: "document_changes",
  DOCUMENT_USERS: "document_users",
  USERS: "users",
  USER_DOCUMENTS: "user_documents",
  USER_PROFILES: "user_profiles",
};

export type Database = {
  public: {
    Tables: {
      [key: string]: any;
    };
  };
};

// Default options for Supabase client
export const DEFAULT_OPTIONS = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  page: 1,
  limit: 10,
};

// Initialize Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  DEFAULT_OPTIONS
);
