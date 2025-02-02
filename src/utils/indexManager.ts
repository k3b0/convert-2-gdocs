import { DocumentPosition } from '../types/googleDocsTypes';

/**
 * Manages text insertion indices for Google Docs API requests
 */
export class IndexManager {
  private currentIndex: number;
  private segmentId?: string;

  constructor(startIndex: number = 1, segmentId?: string) {
    this.currentIndex = startIndex;
    this.segmentId = segmentId;
  }

  /**
   * Get the current position in the document
   */
  getCurrentPosition(): DocumentPosition {
    return {
      index: this.currentIndex,
      segmentId: this.segmentId,
    };
  }

  /**
   * Advance the index by the length of the given text
   * @param text The text being inserted
   * @returns The position before advancing
   */
  advance(text: string): DocumentPosition {
    const position = this.getCurrentPosition();
    this.currentIndex += text.length;
    return position;
  }

  /**
   * Calculate the end index after a text insertion
   * @param startIndex The starting index
   * @param text The text being inserted
   */
  calculateEndIndex(startIndex: number, text: string): number {
    return startIndex + text.length;
  }

  /**
   * Set the current index to a specific position
   * @param index The new index
   * @param segmentId Optional segment ID
   */
  setPosition(index: number, segmentId?: string): void {
    this.currentIndex = index;
    this.segmentId = segmentId;
  }

  /**
   * Get the next position without advancing the current index
   * @param text The text that would be inserted
   */
  peekNextPosition(text: string): DocumentPosition {
    return {
      index: this.currentIndex + text.length,
      segmentId: this.segmentId,
    };
  }

  /**
   * Create a new IndexManager at the current position
   */
  clone(): IndexManager {
    return new IndexManager(this.currentIndex, this.segmentId);
  }

  /**
   * Reset the index manager to its initial state
   */
  reset(startIndex: number = 1, segmentId?: string): void {
    this.currentIndex = startIndex;
    this.segmentId = segmentId;
  }
}