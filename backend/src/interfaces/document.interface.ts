import { DeltaChange, DeltaOperation } from "./delta.interface";

/**
 * Represents a document in the SyncDoc application
 */
export interface IDocument {
  id: string;
  title: string;
  content: string;
  deltas: DeltaChange[];
  users: Record<string, string>;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Document permission levels
 */
export type PermissionLevel = 'viewer' | 'editor' | 'owner';

/**
 * Document permission record
 */
export interface IDocumentPermission {
  id: string;
  user_id: string;
  document_id: string;
  permission_level: PermissionLevel;
  created_at: string;
}

/**
 * Document summary for listings
 */
export interface IDocumentSummary {
  id: string;
  title: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  userCount: number;
}

/**
 * Type for the documents collection
 */
export type DocumentsCollection = Record<string, IDocument>;
