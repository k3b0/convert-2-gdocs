import { DocumentBlock } from '../parse/parseHtmlToBlocks';

export function blocksToRequests(blocks: DocumentBlock[]): any[] {
  const requests: any[] = [];
  let currentIndex = 1;
  
  blocks.forEach(block => {
    const blockStart = currentIndex;
    const blockText = block.text;
    const blockTextWithNewline = blockText + "\n";
    const textLength = blockText.length;
    const fullLength = blockTextWithNewline.length;
    
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
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: blockStart + style.start,
              endIndex: blockStart + Math.min(style.end, textLength)
            },
            textStyle: style.textStyle,
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
    
    currentIndex = blockStart + fullLength;
  });
  
  return requests;
}