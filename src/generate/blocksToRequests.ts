import { DocumentBlock } from '../parse/parseHtmlToBlocks';

export function blocksToRequests(blocks: DocumentBlock[]): any[] {
  const requests: any[] = [];
  let currentIndex = 1;
  let tableStartIndex: number | null = null;
  let tableInitialized = false;
  
  // Calculate total columns needed for table
  let maxColumn = 0;
  blocks.forEach(block => {
    if (block.tableInfo) {
      const endColumn = block.tableInfo.columnIndex + (block.tableInfo.columnSpan || 1);
      maxColumn = Math.max(maxColumn, endColumn);
    }
  });
  
  blocks.forEach(block => {
    const blockStart = currentIndex;
    const blockText = block.text;
    const blockTextWithNewline = blockText + "\n";
    const textLength = blockText.length;
    const fullLength = blockTextWithNewline.length;
    
    // If this is the first table cell, mark the table start location
    if (block.tableInfo && tableStartIndex === null) {
      tableStartIndex = blockStart;
    }

    // Insert Text Request
    requests.push({
      insertText: {
        text: blockTextWithNewline,
        location: { index: blockStart }
      }
    });
    
    // Update Paragraph Style Request
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: blockStart,
          endIndex: blockStart + fullLength
        },
        paragraphStyle: block.paragraphStyle,
        fields: "*" // update all properties
      }
    });
    
    // Inline text style requests
    if (block.inlineStyles && block.inlineStyles.length > 0) {
      block.inlineStyles.forEach(style => {
        // Transform the text style to match Google Docs API schema
        const transformedStyle: any = {};
        
        // Copy simple boolean properties
        if (style.textStyle.bold !== undefined) transformedStyle.bold = style.textStyle.bold;
        if (style.textStyle.italic !== undefined) transformedStyle.italic = style.textStyle.italic;
        if (style.textStyle.underline !== undefined) transformedStyle.underline = style.textStyle.underline;
        
        // Copy link property
        if (style.textStyle.link !== undefined) transformedStyle.link = style.textStyle.link;
        
        // Copy foregroundColor if present
        if (style.textStyle.foregroundColor !== undefined) {
          transformedStyle.foregroundColor = style.textStyle.foregroundColor;
        }

        requests.push({
          updateTextStyle: {
            range: {
              startIndex: blockStart + style.start,
              endIndex: blockStart + Math.min(style.end, textLength)
            },
            textStyle: transformedStyle,
            fields: "*" // update all provided text style properties
          }
        });
      });
    }
    
    // List item request
    if (block.isListItem && block.listInfo) {
      const bulletPreset = block.listInfo.ordered ? "NUMBERED_DECIMAL_ALPHA_ROMAN" : "BULLET_DISC_CIRCLE_SQUARE";
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex: blockStart,
            endIndex: blockStart + textLength
          },
          bulletPreset: bulletPreset
        }
      });
    }

    // Table requests
    if (block.tableInfo) {
      // Initialize table on first cell
      if (!tableInitialized) {
        requests.push({
          insertTable: {
            location: { index: tableStartIndex! },
            rows: 1,
            columns: maxColumn // Account for column spans
          }
        });
        tableInitialized = true;
      }
    } else {
      // Reset table tracking when we're no longer in a table
      tableStartIndex = null;
      tableInitialized = false;
    }
    
    currentIndex = blockStart + fullLength;
  });
  
  return requests;
}