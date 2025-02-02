import type { docs_v1 } from 'googleapis';

// Re-export Google Docs API types
export type { docs_v1 };

// Configuration interface for the converter
export interface ConverterConfig {
  defaultHeadingStyle?: docs_v1.Schema$ParagraphStyle;
  defaultParagraphStyle?: docs_v1.Schema$ParagraphStyle;
  defaultTextStyle?: docs_v1.Schema$TextStyle;
}

// Represents a position in the document
export interface DocumentPosition {
  index: number;
  segmentId?: string;
}

// Represents a text segment with its style
export interface TextSegment {
  text: string;
  style?: docs_v1.Schema$TextStyle;
  paragraphStyle?: docs_v1.Schema$ParagraphStyle;
}

// Represents a list configuration
export interface ListConfig {
  nestingLevel: number;
  listId?: string;
  ordered: boolean;
}

// Custom error types
export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}