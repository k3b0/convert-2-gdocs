import { describe, it, expect } from 'vitest';
import { blocksToRequests } from './blocksToRequests';
import { DocumentBlock } from '../parse/parseHtmlToBlocks';

describe('blocksToRequests', () => {
  it('generates insertText and updateParagraphStyle for a normal block', () => {
    const blocks: DocumentBlock[] = [{
      text: 'Hello',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
    }];
    const requests = blocksToRequests(blocks);
    expect(requests.length).toBe(2);

    const insertTextReq = requests.find(req => req.insertText) as { insertText: { text: string; location: { index: number } } };
    const updateParagraphStyleReq = requests.find(req => req.updateParagraphStyle) as { updateParagraphStyle: { range: { startIndex: number; endIndex: number }, paragraphStyle: { namedStyleType: string }, fields: string } };

    expect(insertTextReq).toBeDefined();
    expect(updateParagraphStyleReq).toBeDefined();
    expect(insertTextReq.insertText.text).toBe('Hello\n');
    expect(insertTextReq.insertText.location.index).toBe(1);
    expect(updateParagraphStyleReq.updateParagraphStyle.range).toEqual({ startIndex: 1, endIndex: 7 });
    expect(updateParagraphStyleReq.updateParagraphStyle.paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
  });

  it('adds updateTextStyle requests for inline style ranges', () => {
    const blocks: DocumentBlock[] = [{
      text: 'Hello World',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      inlineStyles: [{ start: 6, end: 11, textStyle: { bold: true } }],
    }];
    const requests = blocksToRequests(blocks);
    expect(requests.length).toBe(3);
    const updateTextStyleReq = requests.find(req => req.updateTextStyle) as { updateTextStyle: { range: { startIndex: number; endIndex: number }, textStyle: any, fields: string } };
    expect(updateTextStyleReq).toBeDefined();
    expect(updateTextStyleReq.updateTextStyle.range).toEqual({ startIndex: 7, endIndex: 12 });
    expect(updateTextStyleReq.updateTextStyle.textStyle).toEqual({ bold: true });
  });

  it('correctly formats foregroundColor in text style requests', () => {
    const blocks: DocumentBlock[] = [{
      text: 'Colored text',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      inlineStyles: [{
        start: 0,
        end: 12,
        textStyle: {
          foregroundColor: {
            color: {
              rgbColor: {
                red: 1,
                green: 0,
                blue: 0
              }
            }
          }
        }
      }],
    }];
    const requests = blocksToRequests(blocks);
    expect(requests.length).toBe(3);
    const updateTextStyleReq = requests.find(req => req.updateTextStyle) as { updateTextStyle: { range: { startIndex: number; endIndex: number }, textStyle: any, fields: string } };
    expect(updateTextStyleReq).toBeDefined();
    expect(updateTextStyleReq.updateTextStyle.range).toEqual({ startIndex: 1, endIndex: 13 });
    expect(updateTextStyleReq.updateTextStyle.textStyle).toEqual({
      foregroundColor: {
        color: {
          rgbColor: {
            red: 1,
            green: 0,
            blue: 0
          }
        }
      }
    });
  });

  it('advances currentIndex correctly for multiple blocks', () => {
    const blocks: DocumentBlock[] = [
      { text: 'Block A', paragraphStyle: { namedStyleType: 'NORMAL_TEXT' } },
      { text: 'Block B', paragraphStyle: { namedStyleType: 'NORMAL_TEXT' } },
    ];
    const requests = blocksToRequests(blocks);
    const insertTextReqs = requests.filter(req => req.insertText) as { insertText: { location: { index: number } } }[];
    expect(insertTextReqs.length).toBe(2);
    expect(insertTextReqs[0].insertText.location.index).toBe(1);
    // "Block A" has length 7 + newline so its total length is 8, hence Block B starts at 1 + 8 = 9.
    expect(insertTextReqs[1].insertText.location.index).toBe(9);
  });

  it('generates createParagraphBullets for list items', () => {
    const blocks: DocumentBlock[] = [{
      text: 'List item',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: false, nestingLevel: 0 },
    }];
    const requests = blocksToRequests(blocks);
    expect(requests.length).toBe(3);
    const bulletReq = requests.find(req => req.createParagraphBullets) as { createParagraphBullets: { range: { startIndex: number; endIndex: number }, bulletPreset: string } };
    expect(bulletReq).toBeDefined();
    // "List item" has 9 characters so the range is from 1 to 10.
    expect(bulletReq.createParagraphBullets.range).toEqual({ startIndex: 1, endIndex: 10 });
    expect(bulletReq.createParagraphBullets.bulletPreset).toBe('BULLET_DISC_CIRCLE_SQUARE');
  });

  it('generates table requests for table cells', () => {
    const blocks: DocumentBlock[] = [
      {
        text: 'Cell 1',
        paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
        tableInfo: { rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 }
      },
      {
        text: 'Cell 2',
        paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
        tableInfo: { rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 2 }
      }
    ];
    
    const requests = blocksToRequests(blocks);
    
    // For each cell we expect:
    // 1. insertText
    // 2. updateParagraphStyle
    // Plus table structure request:
    // 3. insertTable (once at start, with correct number of columns)
    expect(requests.length).toBe(5); // 2 cells * 2 basic requests + table

    // Verify table creation
    const insertTableReq = requests.find(req => req.insertTable);
    expect(insertTableReq).toBeDefined();
    expect(insertTableReq).toEqual({
      insertTable: {
        location: { index: 1 },
        rows: 1,
        columns: 3 // Account for columnSpan: 2 in second cell
      }
    });

    // Verify text and style requests for both cells
    const insertTextReqs = requests.filter(req => req.insertText);
    expect(insertTextReqs).toHaveLength(2);
    expect(insertTextReqs[0].insertText.text).toBe('Cell 1\n');
    expect(insertTextReqs[1].insertText.text).toBe('Cell 2\n');

    const updateStyleReqs = requests.filter(req => req.updateParagraphStyle);
    expect(updateStyleReqs).toHaveLength(2);
    expect(updateStyleReqs[0].updateParagraphStyle.paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
    expect(updateStyleReqs[1].updateParagraphStyle.paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
  });
});

describe('blocksToRequests edge cases', () => {
  it('generates requests for an empty block', () => {
    const blocks: DocumentBlock[] = [{
      text: '',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
    }];
    const requests = blocksToRequests(blocks);
    // Still produce insertText and updateParagraphStyle.
    expect(requests.length).toBe(2);
    const insertTextReq = requests.find(req => req.insertText) as { insertText: { text: string; location: { index: number } } };
    const updateParagraphStyleReq = requests.find(req => req.updateParagraphStyle) as { updateParagraphStyle: { range: { startIndex: number; endIndex: number }, paragraphStyle: { namedStyleType: string }, fields: string } };
    expect(insertTextReq.insertText.text).toBe('\n');
    expect(insertTextReq.insertText.location.index).toBe(1);
    expect(updateParagraphStyleReq.updateParagraphStyle.range).toEqual({ startIndex: 1, endIndex: 2 });
  });

  it('clamps inline style range when style.end exceeds text length', () => {
    const blocks: DocumentBlock[] = [{
      text: 'Hello',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      inlineStyles: [{ start: 1, end: 10, textStyle: { italic: true } }],
    }];
    const requests = blocksToRequests(blocks);
    // Expected: insertText + updateParagraphStyle + clamped updateTextStyle.
    expect(requests.length).toBe(3);
    const updateTextStyleReq = requests.find(req => req.updateTextStyle) as { updateTextStyle: { range: { startIndex: number; endIndex: number }, textStyle: any, fields: string } };
    // For "Hello", text length is 5 so the inline style range becomes { startIndex: 1+1, endIndex: 1+5 } i.e. {2, 6}.
    expect(updateTextStyleReq.updateTextStyle.range).toEqual({ startIndex: 2, endIndex: 6 });
    expect(updateTextStyleReq.updateTextStyle.textStyle).toEqual({ italic: true });
  });

  it('generates both updateTextStyle and createParagraphBullets for a block with inline styles and list item properties', () => {
    const blocks: DocumentBlock[] = [{
      text: 'List styled',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      inlineStyles: [{ start: 0, end: 4, textStyle: { bold: true } }],
      isListItem: true,
      listInfo: { ordered: false, nestingLevel: 0 },
    }];
    const requests = blocksToRequests(blocks);
    // Expected requests: insertText, updateParagraphStyle, updateTextStyle, and createParagraphBullets.
    expect(requests.length).toBe(4);
    
    const insertTextReq = requests.find(req => req.insertText) as { insertText: { text: string; location: { index: number } } };
    const updateParagraphStyleReq = requests.find(req => req.updateParagraphStyle) as { updateParagraphStyle: { range: { startIndex: number; endIndex: number }, paragraphStyle: { namedStyleType: string }, fields: string } };
    const updateTextStyleReq = requests.find(req => req.updateTextStyle) as { updateTextStyle: { range: { startIndex: number; endIndex: number }, textStyle: any, fields: string } };
    const createParagraphBulletsReq = requests.find(req => req.createParagraphBullets) as { createParagraphBullets: { range: { startIndex: number; endIndex: number }, bulletPreset: string } };

    // For "List styled", text length is 11 and with newline it's 12.
    expect(insertTextReq.insertText.text).toBe('List styled\n');
    expect(insertTextReq.insertText.location.index).toBe(1);
    expect(updateParagraphStyleReq.updateParagraphStyle.range).toEqual({ startIndex: 1, endIndex: 13 });
    // Inline style should be clamped from 1+0 to 1+min(4,11)=5
    expect(updateTextStyleReq.updateTextStyle.range).toEqual({ startIndex: 1, endIndex: 5 });
    expect(updateTextStyleReq.updateTextStyle.textStyle).toEqual({ bold: true });
    // For list item, range is from 1 to 1 + text length of 11 = 12.
    expect(createParagraphBulletsReq.createParagraphBullets.range).toEqual({ startIndex: 1, endIndex: 12 });
    expect(createParagraphBulletsReq.createParagraphBullets.bulletPreset).toBe('BULLET_DISC_CIRCLE_SQUARE');
  });
});
