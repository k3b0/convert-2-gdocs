import type { docs_v1 } from 'googleapis';

export type { docs_v1 };

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}