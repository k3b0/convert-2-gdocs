import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDocConverter } from '../src/GoogleDocConverter';
import { ValidationError } from '../src/types/googleDocsTypes';
import type { docs_v1 } from 'googleapis';

// Mock the marked package
vi.mock('marked', () => {
  const markedFn = vi.fn((markdown: string) => {
    // Process the markdown in multiple passes to handle nested elements
    let html = markdown;

    // First pass: Handle block elements
    html = html
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // Second pass: Handle lists with proper nesting
    const listLines = html.split('\n');
    const processedLines: string[] = [];
    let currentUl: boolean | null = null;
    let currentNesting = 0;

    for (let i = 0; i < listLines.length; i++) {
      const line = listLines[i];
      const match = line.match(/^(\s*?)- (.+)$/);
      
      if (match) {
        const [, indent, content] = match;
        const nesting = indent.length / 2;
        
        if (currentUl === null || nesting === 0) {
          if (currentUl !== null) {
            // Close previous list
            while (currentNesting >= 0) {
              processedLines.push('</ul>');
              currentNesting--;
            }
          }
          processedLines.push('<ul>');
          currentUl = true;
        } else if (nesting > currentNesting) {
          processedLines.push('<ul>');
        } else if (nesting < currentNesting) {
          while (currentNesting > nesting) {
            processedLines.push('</li></ul>');
            currentNesting--;
          }
          processedLines.push('</li>');
        } else {
          processedLines.push('</li>');
        }
        
        processedLines.push(`<li>${content}`);
        currentNesting = nesting;
      } else {
        if (currentUl !== null) {
          // Close all open lists
          processedLines.push('</li>');
          while (currentNesting >= 0) {
            processedLines.push('</ul>');
            currentNesting--;
          }
          currentUl = null;
        }
        processedLines.push(line);
      }
    }
    
    // Close any remaining lists
    if (currentUl !== null) {
      processedLines.push('</li>');
      while (currentNesting >= 0) {
        processedLines.push('</ul>');
        currentNesting--;
      }
    }
    
    html = processedLines.join('\n');

    // Third pass: Handle inline formatting
    html = html
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    // Final pass: Handle paragraphs and line breaks
    return html
      .split(/\n\n+/)
      .map(block => block.trim())
      .filter(Boolean)
      .map(block => block.match(/^<[h\d]|<ul|<\/ul|<li|<\/li/) ? block : `<p>${block}</p>`)
      .join('\n')
      .replace(/\n(?!<)(?!$)/g, '<br>');
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
      
      // Verify heading and paragraph styles are applied
      const styleRequests = requests.filter(r => r.updateParagraphStyle);
      expect(styleRequests.length).toBe(2);
      expect(styleRequests[0].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('HEADING_1');
      expect(styleRequests[1].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('NORMAL_TEXT');
    });

    it('should aggregate contiguous text nodes into a single insertText request', () => {
      const html = '<p>This is <span>an example</span> of contiguous text.</p>';
      const requests = converter.convertHtml(html);
      const textInserts = requests.filter(r => r.insertText);
      expect(textInserts.length).toBe(1);
      expect(textInserts[0].insertText?.text).toBe('This is an example of contiguous text.');
    });

    it('should handle nested formatting correctly', () => {
      const html = '<p>This is <em>italic with <strong>bold</strong> text</em></p>';
      const requests = converter.convertHtml(html);
      
      // Find text style updates
      const styleUpdates = requests.filter(r => r.updateTextStyle);
      expect(styleUpdates.length).toBe(2);
      
      // Check italic style
      const italicStyle = styleUpdates.find(r => r.updateTextStyle?.textStyle?.italic);
      expect(italicStyle).toBeTruthy();
      
      // Check bold style
      const boldStyle = styleUpdates.find(r =>
        r.updateTextStyle?.textStyle?.bold && r.updateTextStyle?.textStyle?.italic
      );
      expect(boldStyle).toBeTruthy();
    });

    it('should preserve whitespace and block spacing', () => {
      const html = '<h1>Title</h1>\n<p>First paragraph</p>\n<p>Second paragraph</p>';
      const requests = converter.convertHtml(html);
      
      // Find text insertions
      const textInserts = requests.filter(r => r.insertText);
      
      // Verify text content is properly separated
      const textContent = textInserts.map(r => r.insertText?.text).join('');
      expect(textContent).toContain('Title\nFirst paragraph\nSecond paragraph');
      
      // Verify each block has its own style update
      const styleUpdates = requests.filter(r => r.updateParagraphStyle);
      expect(styleUpdates.length).toBe(3); // One for each block
      
      // Verify style ranges don't overlap
      for (let i = 0; i < styleUpdates.length - 1; i++) {
        const current = styleUpdates[i].updateParagraphStyle?.range;
        const next = styleUpdates[i + 1].updateParagraphStyle?.range;
        expect(current?.endIndex).toBeLessThanOrEqual(next?.startIndex || 0);
      }
    });

    it('should handle consecutive block elements with proper spacing', () => {
      const html = '<h1>Header</h1><p>Paragraph</p><ul><li>List item</li></ul>';
      const requests = converter.convertHtml(html);
      
      // Get all text insertions
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      
      // Verify blocks are separated by newlines
      expect(textContent).toContain('Header\nParagraph\nList item');
      
      // Verify no duplicate style updates for the same range
      const styleRanges = requests
        .filter(r => r.updateParagraphStyle)
        .map(r => r.updateParagraphStyle?.range);
      
      const uniqueRanges = new Set(styleRanges.map(r => `${r?.startIndex}-${r?.endIndex}`));
      expect(uniqueRanges.size).toBe(styleRanges.length);
    });

    it('should maintain correct style boundaries for inline formatting', () => {
      const html = '<p>Normal <strong>bold <em>bold-italic</em></strong> normal</p>';
      const requests = converter.convertHtml(html);
      
      // Get text content and style updates
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      const styleUpdates = requests.filter(r => r.updateTextStyle);
      
      // Verify text is properly spaced
      expect(textContent).toBe('Normal bold bold-italic normal');
      
      // Verify style boundaries
      const boldStyle = styleUpdates.find(r =>
        r.updateTextStyle?.textStyle?.bold && !r.updateTextStyle?.textStyle?.italic
      );
      const boldItalicStyle = styleUpdates.find(r =>
        r.updateTextStyle?.textStyle?.bold && r.updateTextStyle?.textStyle?.italic
      );
      
      expect(boldStyle?.updateTextStyle?.range?.startIndex).toBeLessThan(
        boldItalicStyle?.updateTextStyle?.range?.startIndex || 0
      );
      expect(boldItalicStyle?.updateTextStyle?.range?.endIndex).toBeLessThanOrEqual(
        boldStyle?.updateTextStyle?.range?.endIndex || 0
      );
    });

    it('should handle empty and whitespace-only blocks correctly', () => {
      const html = '<h1></h1><p>  </p><div>Content</div>';
      const requests = converter.convertHtml(html);
      
      // Verify empty blocks don't create unnecessary style updates
      const styleUpdates = requests.filter(r => r.updateParagraphStyle);
      expect(styleUpdates.length).toBe(1); // Only for the div with content
      
      // Verify whitespace handling
      const textInserts = requests.filter(r => r.insertText);
      expect(textInserts.length).toBe(1); // Only the content
      expect(textInserts[0].insertText?.text).toBe('Content');
    });

    it('should handle complex document structure with mixed content', () => {
      const html = `
        <h1>Document Title</h1>
        <p>Introduction paragraph</p>
        <h2>Section 1</h2>
        <ul>
          <li>First point with <strong>bold</strong> text</li>
          <li>Second point with <code>code</code> block
            <ul>
              <li>Nested point with <em>italic</em></li>
            </ul>
          </li>
        </ul>
        <p>Conclusion paragraph</p>
      `;
      const requests = converter.convertHtml(html);
      
      // Verify document structure with proper spacing
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      
      expect(textContent).toBe(
        'Document Title\n' +
        'Introduction paragraph\n' +
        'Section 1\n' +
        'First point with bold text\n' +
        'Second point with code block\n' +
        'Nested point with italic\n' +
        'Conclusion paragraph'
      );
      
      // Verify heading hierarchy
      const headingStyles = requests.filter(r =>
        r.updateParagraphStyle?.paragraphStyle?.namedStyleType?.startsWith('HEADING_')
      );
      expect(headingStyles.length).toBe(2);
      expect(headingStyles[0].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('HEADING_1');
      expect(headingStyles[1].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('HEADING_2');
      
      // Verify list structure
      const bulletRequests = requests.filter(r => r.createParagraphBullets);
      expect(bulletRequests.length).toBe(3);
      
      // Verify inline formatting
      const styleUpdates = requests.filter(r => r.updateTextStyle);
      const hasCodeStyle = styleUpdates.some(r =>
        r.updateTextStyle?.textStyle?.weightedFontFamily?.fontFamily?.includes('Courier')
      );
      expect(hasCodeStyle).toBe(true);
    });

    it('should handle lists with proper spacing and indentation', () => {
      const html = '<ul><li>Item 1</li><li>Item 2<ul><li>Nested item</li></ul></li></ul>';
      const requests = converter.convertHtml(html);
      
      // Verify text content and spacing
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      expect(textContent).toBe('Item 1\nItem 2\nNested item');
      
      // Find bullet requests
      const bulletRequests = requests.filter(r => r.createParagraphBullets);
      expect(bulletRequests.length).toBe(3);
      
      // Verify nested list formatting
      const nestedBullet = bulletRequests.find(r =>
        r.createParagraphBullets?.bulletPreset === 'BULLET_DISC_CIRCLE_SQUARE'
      );
      expect(nestedBullet).toBeTruthy();
      
      // Verify indentation
      const indentRequests = requests.filter(r =>
        r.updateParagraphStyle?.paragraphStyle?.indentStart?.magnitude === 36
      );
      expect(indentRequests.length).toBe(1); // Only nested item should be indented
    });

    it('should handle code blocks with proper formatting', () => {
      const html = '<p>Normal text <code>code block</code> more text</p>';
      const requests = converter.convertHtml(html);
      
      // Verify text content
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      expect(textContent).toBe('Normal text code block more text');
      
      // Verify code formatting
      const codeStyle = requests.find(r =>
        r.updateTextStyle?.textStyle?.weightedFontFamily?.fontFamily?.includes('Courier')
      );
      expect(codeStyle).toBeTruthy();
      
      // Verify style boundaries
      const codeRange = codeStyle?.updateTextStyle?.range;
      expect(codeRange?.startIndex).toBe(textContent.indexOf('code block'));
      expect(codeRange?.endIndex).toBe(textContent.indexOf('code block') + 'code block'.length);
    });

    it('should ensure proper document-level structure and spacing', () => {
      const html = `
        <h1>Title</h1>
        <p>First paragraph</p>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <h2>Subtitle</h2>
        <p>Second paragraph</p>
      `;
      const requests = converter.convertHtml(html);
      
      // Verify text content with proper block spacing
      const textContent = requests
        .filter(r => r.insertText)
        .map(r => r.insertText?.text)
        .join('');
      
      const expectedContent =
        'Title\n' +
        'First paragraph\n' +
        'List item 1\n' +
        'List item 2\n' +
        'Subtitle\n' +
        'Second paragraph';
      
      expect(textContent).toBe(expectedContent);
      
      // Verify block style updates don't overlap
      const styleUpdates = requests.filter(r => r.updateParagraphStyle);
      for (let i = 0; i < styleUpdates.length - 1; i++) {
        const current = styleUpdates[i].updateParagraphStyle?.range;
        const next = styleUpdates[i + 1].updateParagraphStyle?.range;
        
        // Ensure each block's style range ends before the next one starts
        expect(current?.endIndex).toBeLessThanOrEqual(next?.startIndex || 0);
        
        // Verify there's a newline character between blocks
        const textBetweenBlocks = textContent.substring(
          current?.endIndex || 0,
          next?.startIndex || 0
        );
        expect(textBetweenBlocks).toContain('\n');
      }
    });
  });

  describe('convertMarkdown', () => {
    it('should convert Markdown to Google Docs requests with proper heading styles', async () => {
      const markdown = '# Main Title\n## Subtitle';
      const requests = await converter.convertMarkdown(markdown);
      
      expect(Array.isArray(requests)).toBe(true);
      expect(requests.length).toBeGreaterThan(0);
      
      // Verify heading styles
      const headingStyles = requests.filter(r =>
        r.updateParagraphStyle?.paragraphStyle?.namedStyleType?.startsWith('HEADING_')
      );
      expect(headingStyles.length).toBe(2);
      expect(headingStyles[0].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('HEADING_1');
      expect(headingStyles[1].updateParagraphStyle?.paragraphStyle?.namedStyleType).toBe('HEADING_2');
    });

    it('should handle nested formatting in Markdown', async () => {
      const markdown = 'This is **bold with *italic* inside** and `code`';
      const requests = await converter.convertMarkdown(markdown);
      
      // Find text style updates
      const styleUpdates = requests.filter(r => r.updateTextStyle);
      expect(styleUpdates.length).toBeGreaterThan(2); // Bold, italic, and code styles
      
      // Check for nested styles
      const boldItalic = styleUpdates.find(r =>
        r.updateTextStyle?.textStyle?.bold && r.updateTextStyle?.textStyle?.italic
      );
      expect(boldItalic).toBeTruthy();
    });

    it('should properly format nested lists', async () => {
      const markdown = `- Item 1
  - Nested 1
  - Nested 2
- Item 2`;
      const requests = await converter.convertMarkdown(markdown);
      
      // Verify list formatting
      const bulletRequests = requests.filter(r => r.createParagraphBullets);
      expect(bulletRequests.length).toBe(4);
      
      // Check nesting levels
      const nestedBullets = bulletRequests.filter(r =>
        r.createParagraphBullets?.bulletPreset === 'BULLET_DISC_CIRCLE_SQUARE'
      );
      expect(nestedBullets.length).toBe(2);
    });

    it('should preserve paragraph spacing and line breaks', async () => {
      const markdown = `# Title

First paragraph
with a line break

Second paragraph`;
      const requests = await converter.convertMarkdown(markdown);
      
      // Check text insertions and spacing
      const textInserts = requests.filter(r => r.insertText);
      const newlineInserts = textInserts.filter(r => r.insertText?.text === '\n');
      expect(newlineInserts.length).toBeGreaterThan(1);
      
      // Verify paragraphs are properly separated
      const paragraphStyles = requests.filter(r =>
        r.updateParagraphStyle?.paragraphStyle?.namedStyleType === 'NORMAL_TEXT'
      );
      expect(paragraphStyles.length).toBe(2);
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