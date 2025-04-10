import Delta from 'quill-delta';
import { DeltaOperation } from 'quill';

/**
 * Represents a delta change with metadata
 */
export interface DeltaChange {
  delta: Delta;
  userId: string;
  userName: string;
  timestamp: number;
}

export { Delta, DeltaOperation };
