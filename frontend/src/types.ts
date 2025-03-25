/**
 * Represents a Quill Delta operation
 */
export interface DeltaOperation {
  insert?: string | { [key: string]: any };
  delete?: number;
  retain?: number;
  attributes?: { [key: string]: any };
}

/**
 * Represents a Quill Delta - the core format for describing content and changes
 */
export interface Delta {
  ops: DeltaOperation[];
}

/**
 * Represents a delta change with metadata
 */
export interface DeltaChange {
  delta: Delta;
  userId: string;
  userName: string;
  timestamp: number;
}

/**
 * Authentication related interfaces
 */
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: AuthUser | null;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface AuthError {
  message: string;
  status?: number;
}

/**
 * Document related interfaces
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  users: Record<string, string>;
  deltas: DeltaChange[];
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
}

export interface DocumentPermission {
  id: string;
  user_id: string;
  document_id: string;
  permission_level: 'read' | 'write' | 'admin';
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface CursorPosition {
  index: number;
  length: number;
}

export interface User {
  id: string;
  email: string | undefined;
  name: string;
}
