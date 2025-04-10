/*
 * SyncDoc Application Types
 */

import Delta from 'quill-delta';
import { DeltaOperation } from 'quill';
import { DeltaChange } from './interfaces/delta.interface';

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
