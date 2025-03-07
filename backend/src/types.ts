/*
 * SyncDoc Application Types
 */

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
 * Represents a document in the SyncDoc application
 */
export interface Document {
  title: string;
  content: string;
  users: Record<string, string>;
  deltas: DeltaChange[];
}

/**
 * Type for the documents collection
 */
export type DocumentsCollection = Record<string, Document>;
