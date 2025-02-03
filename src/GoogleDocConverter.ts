import { docs_v1, ValidationError } from './types/googleDocsTypes';
import { parseHtmlToBlocks } from './parse/parseHtmlToBlocks';
import { blocksToRequests } from './generate/blocksToRequests';

/**
 * Main class for converting HTML content to Google Docs API requests
 */
export class GoogleDocConverter {
  /**
   * Convert HTML string to Google Docs API requests
   * @param html The HTML string to convert
   * @returns Array of Google Docs API batchUpdate requests
   * @throws {ValidationError} If input is invalid
   */
  public convertHtml(html: string): docs_v1.Schema$Request[] {
    if (typeof html !== 'string') {
      throw new ValidationError('HTML input must be a string');
    }

    if (!html.trim()) {
      throw new ValidationError('HTML input cannot be empty');
    }

    try {
      const blocks = parseHtmlToBlocks(html);
      return blocksToRequests(blocks);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(`Failed to convert HTML: ${error.message}`);
      }
      throw new ValidationError('Failed to convert HTML: Unknown error');
    }
  }

  /**
   * Create a batch update request for a Google Doc
   * @param docId The ID of the Google Doc to update
   * @param requests Array of requests to include in the batch
   * @returns Batch update request object
   * @throws {ValidationError} If input parameters are invalid
   */
  public static createBatchUpdateRequest(
    docId: string,
    requests: docs_v1.Schema$Request[]
  ): docs_v1.Schema$BatchUpdateDocumentRequest {
    if (!docId || typeof docId !== 'string') {
      throw new ValidationError('Document ID must be a non-empty string');
    }

    if (!Array.isArray(requests)) {
      throw new ValidationError('Requests must be an array');
    }

    if (requests.length === 0) {
      throw new ValidationError('Requests array cannot be empty');
    }

    return {
      requests,
      writeControl: {
        targetRevisionId: undefined,
        requiredRevisionId: undefined
      }
    };
  }
}