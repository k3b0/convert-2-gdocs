import { describe, it, expect } from 'vitest';
import { htmlToGDocRequests } from './htmlToGDocRequests';

describe('htmlToGDocRequests', () => {
  it('converts a single <p> into correct Google Docs requests', () => {
    const html = '<p>Hello World</p>';
    const requests = htmlToGDocRequests(html);
    
    // Expect 2 requests: insertText and updateParagraphStyle.
    expect(requests.length).toBe(2);
    
    const insertText = requests.find(req => req.type === 'insertText') as { type: 'insertText'; text: string; location: { index: number } };
    const updateParagraphStyle = requests.find(req => req.type === 'updateParagraphStyle') as { type: 'updateParagraphStyle'; range: { start: number; end: number }; paragraphStyle: { namedStyleType: string } };
    
    expect(insertText).toBeDefined();
    expect(insertText.text).toBe('Hello World\n');
    expect(insertText.location.index).toBe(1);
    
    expect(updateParagraphStyle).toBeDefined();
    expect(updateParagraphStyle.range.start).toBe(1);
    expect(updateParagraphStyle.range.end).toBe(13);
    expect(updateParagraphStyle.paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
  });

  it('converts multiple <p> tags into correct Google Docs requests', () => {
    const html = '<p>First</p><p>Second</p>';
    const requests = htmlToGDocRequests(html);
    
    // Expect 4 requests in total (2 per block)
    expect(requests.length).toBe(4);
    
    // Check first block's requests
    const firstInsertText = requests.find(req => req.type === 'insertText' && (req as any).text.includes('First')) as { type: 'insertText'; text: string; location: { index: number } };
    const firstUpdateParagraph = requests.find(req => req.type === 'updateParagraphStyle' && (req as any).paragraphStyle.namedStyleType === 'NORMAL_TEXT') as { type: 'updateParagraphStyle'; range: { start: number; end: number }; paragraphStyle: { namedStyleType: string } };
    
    expect(firstInsertText).toBeDefined();
    expect(firstInsertText.text).toBe('First\n');
    expect(firstInsertText.location.index).toBe(1);
    
    const firstTextLength = 'First\n'.length; // 6
    expect(firstUpdateParagraph.range.start).toBe(1);
    expect(firstUpdateParagraph.range.end).toBe(1 + firstTextLength);
    
    // Check second block's requests using filtering by second occurrence.
    const insertTexts = requests.filter(req => req.type === 'insertText') as { type: 'insertText'; text: string; location: { index: number } }[];
    const updateParagraphs = requests.filter(req => req.type === 'updateParagraphStyle') as { type: 'updateParagraphStyle'; range: { start: number; end: number }; paragraphStyle: { namedStyleType: string } }[];
    
    const secondInsertText = insertTexts[1];
    const secondUpdateParagraph = updateParagraphs[1];
    
    expect(secondInsertText.text).toBe('Second\n');
    // Expect second block's start index to be equal to first block's end index (1 + 6 = 7).
    expect(secondInsertText.location.index).toBe(7);
    
    const secondTextLength = 'Second\n'.length; // 7
    expect(secondUpdateParagraph.range.start).toBe(7);
    expect(secondUpdateParagraph.range.end).toBe(7 + secondTextLength);
  });

  it('handles multiple elements including headings and inline styles', () => {
    const html = '<h1>Title</h1><p>Normal <strong>bold</strong></p>';
    const requests = htmlToGDocRequests(html);

    // Expect 5 requests: 2 for heading (insert + style), 3 for paragraph (insert + style + bold)
    expect(requests.length).toBe(5);

    // Check heading
    const headingInsert = requests.find(req => 
      req.type === 'insertText' && (req as any).text === 'Title\n'
    ) as { type: 'insertText'; text: string; location: { index: number } };
    expect(headingInsert).toBeDefined();
    expect(headingInsert.location.index).toBe(1);

    const headingStyle = requests.find(req => 
      req.type === 'updateParagraphStyle' && (req as any).paragraphStyle.namedStyleType === 'HEADING_1'
    );
    expect(headingStyle).toBeDefined();

    // Check paragraph with bold text
    const paragraphInsert = requests.find(req => 
      req.type === 'insertText' && (req as any).text === 'Normal bold\n'
    ) as { type: 'insertText'; text: string; location: { index: number } };
    expect(paragraphInsert).toBeDefined();
    expect(paragraphInsert.location.index).toBe(7); // After 'Title\n'

    const boldStyle = requests.find(req => 
      req.type === 'updateTextStyle' && (req as any).textStyle.bold === true
    ) as { type: 'updateTextStyle'; range: { start: number; end: number }; textStyle: { bold: boolean } };
    expect(boldStyle).toBeDefined();
    expect(boldStyle.range.start).toBe(13); // 7 (start) + 6 ('Normal ')
    expect(boldStyle.range.end).toBe(17); // 13 + 4 ('bold')
  });

  it('generates multiple blocks and bullet requests from a <ul>', () => {
    const html = '<ul><li>First item</li><li>Second item</li></ul>';
    const requests = htmlToGDocRequests(html);

    // Expect 6 requests: (insert + style + bullet) × 2 items
    expect(requests.length).toBe(6);

    const insertTexts = requests.filter(req => req.type === 'insertText') as { type: 'insertText'; text: string; location: { index: number } }[];
    expect(insertTexts).toHaveLength(2);
    expect(insertTexts[0].text).toBe('First item\n');
    expect(insertTexts[1].text).toBe('Second item\n');

    const bulletRequests = requests.filter(req => req.type === 'createParagraphBullets') as { type: 'createParagraphBullets'; range: { start: number; end: number }; listInfo: { ordered: boolean; nestingLevel: number } }[];
    expect(bulletRequests).toHaveLength(2);
    bulletRequests.forEach(req => {
      expect(req.listInfo).toEqual({
        ordered: false,
        nestingLevel: 0
      });
    });
  });
});