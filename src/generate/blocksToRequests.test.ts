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
    const insertText = requests.find(req => req.type === 'insertText') as { type: 'insertText'; text: string; location: { index: number } };
    const updateParagraphStyle = requests.find(req => req.type === 'updateParagraphStyle') as { type: 'updateParagraphStyle'; range: { start: number; end: number }; paragraphStyle: { namedStyleType: string } };
    expect(insertText).toBeDefined();
    expect(updateParagraphStyle).toBeDefined();
    expect(insertText.text).toBe('Hello\n');
    expect(insertText.location.index).toBe(1);
    expect(updateParagraphStyle.range.start).toBe(1);
    expect(updateParagraphStyle.range.end).toBe(7);
    expect(updateParagraphStyle.paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
  });

  it('adds updateTextStyle requests for inline style ranges', () => {
    const blocks: DocumentBlock[] = [{
      text: 'Hello World',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      inlineStyles: [{ start: 6, end: 11, textStyle: { bold: true } }],
    }];
    const requests = blocksToRequests(blocks);
    expect(requests.length).toBe(3);
    const updateTextStyle = requests.find(req => req.type === 'updateTextStyle') as { type: 'updateTextStyle'; range: { start: number; end: number }; textStyle: any };
    expect(updateTextStyle).toBeDefined();
    expect(updateTextStyle.range.start).toBe(7);
    expect(updateTextStyle.range.end).toBe(12);
    expect(updateTextStyle.textStyle).toEqual({ bold: true });
  });

  it('advances currentIndex correctly for multiple blocks', () => {
    const blocks: DocumentBlock[] = [
      { text: 'Block A', paragraphStyle: { namedStyleType: 'NORMAL_TEXT' } },
      { text: 'Block B', paragraphStyle: { namedStyleType: 'NORMAL_TEXT' } },
    ];
    const requests = blocksToRequests(blocks);
    const insertTexts = requests.filter(req => req.type === 'insertText') as { type: 'insertText'; location: { index: number } }[];
    expect(insertTexts.length).toBe(2);
    expect(insertTexts[0].location.index).toBe(1);
    expect(insertTexts[1].location.index).toBe(9);
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
    const bulletRequest = requests.find(req => req.type === 'createParagraphBullets') as { type: 'createParagraphBullets'; range: { start: number; end: number }; listInfo: { ordered: boolean; nestingLevel: number } };
    expect(bulletRequest).toBeDefined();
    expect(bulletRequest.range.start).toBe(1);
    expect(bulletRequest.range.end).toBe(10);
    expect(bulletRequest.listInfo).toEqual({ ordered: false, nestingLevel: 0 });
  });
});