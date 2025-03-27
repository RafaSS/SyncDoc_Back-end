/**
 * Type definitions for SyncDoc application
 */

export interface Delta {
  ops: Array<any>;
}

export interface Range {
  index: number;
  length: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color?: string;
}

export interface DeltaChange {
  userName: string;
  userId: string;
  timestamp: number;
  delta: Delta;
  socketId: string;
}

export interface Document {
  id: string;
  title: string;
  content: any;
  users: Record<string, string>;
  deltas: DeltaChange[];
  created_at: string;
  updated_at: string;
}
