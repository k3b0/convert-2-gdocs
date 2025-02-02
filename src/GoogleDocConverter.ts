import type { docs_v1 } from 'googleapis';
import { ConverterConfig, ValidationError } from './types/googleDocsTypes';
import { htmlToGDocRequests } from './converters/htmlToGDoc';
import { markdownToHtml } from './converters/mdToHtml';

/**
 * Main class for converting Markdown or HTML content to Google Docs API requests
 */
export class GoogleDocConverter {
  private config: ConverterConfig;

  /**
   * Create a new GoogleDocConverter instance
   * @param config Optional configuration for the converter
   */
  constructor(config: ConverterConfig = {}) {
    this.config = config;
  }

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

    return htmlToGDocRequests(html, this.config);
  }

  /**
   * Convert Markdown string to Google Docs API requests
   * @param markdown The Markdown string to convert
   * @returns Array of Google Docs API batchUpdate requests
   * @throws {ValidationError} If input is invalid
   */
  public async convertMarkdown(markdown: string): Promise<docs_v1.Schema$Request[]> {
    if (typeof markdown !== 'string') {
      throw new ValidationError('Markdown input must be a string');
    }

    const html = await markdownToHtml(markdown);
    return this.convertHtml(html);
  }

  /**
   * Update the converter configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<ConverterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current converter configuration
   * @returns Current configuration
   */
  public getConfig(): ConverterConfig {
    return { ...this.config };
  }

  /**
   * Reset the converter configuration to defaults
   */
  public resetConfig(): void {
    this.config = {};
  }

  /**
   * Create a batch update request for a Google Doc
   * @param docId The ID of the Google Doc to update
   * @param requests Array of requests to include in the batch
   * @returns Batch update request object
   */
  public static createBatchUpdateRequest(
    docId: string,
    requests: docs_v1.Schema$Request[]
  ): docs_v1.Schema$BatchUpdateDocumentRequest {
    if (!docId) {
      throw new ValidationError('Document ID is required');
    }

    if (!Array.isArray(requests)) {
      throw new ValidationError('Requests must be an array');
    }

    return {
      requests,
    };
  }
}