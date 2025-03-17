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
