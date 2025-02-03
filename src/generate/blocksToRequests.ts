import { DocumentBlock } from '../parse/parseHtmlToBlocks';

export interface InsertTextRequest {
  type: 'insertText';
  text: string;
  location: { index: number };
}

export interface UpdateParagraphStyleRequest {
  type: 'updateParagraphStyle';
  range: { start: number; end: number };
  paragraphStyle: { namedStyleType: string };
}

export interface UpdateTextStyleRequest {
  type: 'updateTextStyle';
  range: { start: number; end: number };
  textStyle: any;
}

export interface CreateParagraphBulletsRequest {
  type: 'createParagraphBullets';
  range: { start: number; end: number };
  listInfo: { ordered: boolean; nestingLevel: number };
}

export type GoogleDocsRequest = InsertTextRequest | UpdateParagraphStyleRequest | UpdateTextStyleRequest | CreateParagraphBulletsRequest;

export function blocksToRequests(blocks: DocumentBlock[]): GoogleDocsRequest[] {
  const requests: GoogleDocsRequest[] = [];
  let currentIndex = 1;
  
  blocks.forEach(block => {
    // Calculate positions
    const blockStart = currentIndex;
    const blockText = block.text;
    const blockTextWithNewline = blockText + "\n";
    const textLength = blockText.length;
    const fullLength = blockTextWithNewline.length;
    
    // Insert Text Request (includes newline)
    requests.push({
      type: 'insertText',
      text: blockTextWithNewline,
      location: { index: blockStart }
    });
    
    // Update Paragraph Style Request (includes newline)
    requests.push({
      type: 'updateParagraphStyle',
      range: {
        start: blockStart,
        end: blockStart + fullLength
      },
      paragraphStyle: block.paragraphStyle
    });
    
    // Inline text style requests (exclude newline)
    if (block.inlineStyles && block.inlineStyles.length > 0) {
      block.inlineStyles.forEach(style => {
        requests.push({
          type: 'updateTextStyle',
          range: {
            start: blockStart + style.start,
            end: blockStart + Math.min(style.end, textLength) // Ensure we don't extend into newline
          },
          textStyle: style.textStyle
        });
      });
    }
    
    // List item request (exclude newline)
    if (block.isListItem && block.listInfo) {
      requests.push({
        type: 'createParagraphBullets',
        range: {
          start: blockStart,
          end: blockStart + textLength // Exclude newline
        },
        listInfo: block.listInfo
      });
    }
    
    currentIndex = blockStart + fullLength;
  });
  
  return requests;
}