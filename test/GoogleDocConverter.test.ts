import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDocConverter } from '../src/GoogleDocConverter';
import { ValidationError } from '../src/types/googleDocsTypes';
import type { docs_v1 } from 'googleapis';

// Mock the marked package
vi.mock('marked', () => {
  const markedFn = vi.fn((markdown: string) => {
    // Simple mock implementation for testing
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
  });

  // Add setOptions to the function object
  const marked = Object.assign(markedFn, {
    setOptions: vi.fn(),
  });

  return { marked };
});

describe('GoogleDocConverter', () => {
  let converter: GoogleDocConverter;

  beforeEach(() => {
    converter = new GoogleDocConverter();
    vi.clearAllMocks();
  });

  describe('convertHtml', () => {
    it('should convert HTML to Google Docs requests', () => {
      const html = '<h1>Test</h1><p>Hello world</p>';
      const requests = converter.convertHtml(html);
      
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
    });

    it('should throw ValidationError for non-string input', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        converter.convertHtml(123);
      }).toThrow(ValidationError);
    });
  });

  describe('convertMarkdown', () => {
    it('should convert Markdown to Google Docs requests', async () => {
      const markdown = '# Test\nHello world';
      const requests = await converter.convertMarkdown(markdown);
      
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
    });

    it('should throw ValidationError for non-string input', async () => {
      await expect(async () => {
        // @ts-expect-error Testing invalid input
        await converter.convertMarkdown(123);
      }).rejects.toThrow(ValidationError);
    });
  });

  describe('configuration', () => {
    it('should update config correctly', () => {
      const newConfig = {
        defaultHeadingStyle: {
          namedStyleType: 'HEADING_1'
        }
      };
      converter.updateConfig(newConfig);
      expect(converter.getConfig()).toEqual(newConfig);
    });

    it('should reset config to defaults', () => {
      converter.updateConfig({
        defaultHeadingStyle: {
          namedStyleType: 'HEADING_1'
        }
      });
      converter.resetConfig();
      expect(converter.getConfig()).toEqual({});
    });

    it('should merge new config with existing', () => {
      converter.updateConfig({
        defaultHeadingStyle: {
          namedStyleType: 'HEADING_1'
        }
      });
      converter.updateConfig({
        defaultParagraphStyle: {
          namedStyleType: 'NORMAL_TEXT'
        }
      });
      expect(converter.getConfig()).toEqual({
        defaultHeadingStyle: {
          namedStyleType: 'HEADING_1'
        },
        defaultParagraphStyle: {
          namedStyleType: 'NORMAL_TEXT'
        }
      });
    });
  });

  describe('createBatchUpdateRequest', () => {
    it('should create valid batch update request', () => {
      const docId = 'test-doc-id';
      const requests: docs_v1.Schema$Request[] = [
        {
          insertText: {
            text: 'Test',
            location: { index: 1 },
          },
        },
      ];

      const batchRequest = GoogleDocConverter.createBatchUpdateRequest(docId, requests);
      expect(batchRequest).toEqual({ requests });
    });

    it('should throw ValidationError for empty document ID', () => {
      expect(() => {
        GoogleDocConverter.createBatchUpdateRequest('', []);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array requests', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        GoogleDocConverter.createBatchUpdateRequest('test-id', {});
      }).toThrow(ValidationError);
    });
  });
});