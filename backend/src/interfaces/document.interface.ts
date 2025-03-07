import { DeltaChange } from './delta.interface';

/**
 * Represents a document in the SyncDoc application
 */
export interface IDocument {
  id: string;
  title: string;
  content: string;
  users: Record<string, string>;
  deltas: DeltaChange[];
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
}

/**
 * Type for the documents collection
 */
export type DocumentsCollection = Record<string, IDocument>;
