import { describe, it, expect } from 'vitest';
import { htmlToGDocRequests } from './htmlToGDocRequests';

describe('htmlToGDocRequests', () => {
  it('converts a single <p> into correct Google Docs requests', () => {
    const html = '<p>Hello World</p>';
    const requests = htmlToGDocRequests(html);

    expect(requests.length).toBe(2);

    const insertText = requests.find((r) => r.insertText) as {
      insertText: { text: string; location: { index: number } };
    };
    const updateParagraphStyle = requests.find((r) => r.updateParagraphStyle) as {
      updateParagraphStyle: {
        range: { startIndex: number; endIndex: number };
        paragraphStyle: { namedStyleType: string };
      };
    };

    expect(insertText.insertText.text).toBe('Hello World\n');
    expect(insertText.insertText.location.index).toBe(1);
    expect(updateParagraphStyle.updateParagraphStyle.range).toEqual({
      startIndex: 1,
      endIndex: 13,
    });
    expect(updateParagraphStyle.updateParagraphStyle.paragraphStyle).toEqual({
      namedStyleType: 'NORMAL_TEXT',
    });
  });

  it('converts multiple <p> tags into correct Google Docs requests', () => {
    const html = '<p>First</p><p>Second</p>';
    const requests = htmlToGDocRequests(html);

    expect(requests.length).toBe(4);

    const insertTexts = requests.filter((r) => r.insertText) as {
      insertText: { text: string; location: { index: number } };
    }[];
    expect(insertTexts).toHaveLength(2);
    expect(insertTexts[0].insertText.text).toBe('First\n');
    expect(insertTexts[0].insertText.location.index).toBe(1);
    expect(insertTexts[1].insertText.text).toBe('Second\n');
    expect(insertTexts[1].insertText.location.index).toBe(7);

    const updateParagraphs = requests.filter((r) => r.updateParagraphStyle) as {
      updateParagraphStyle: { range: { startIndex: number; endIndex: number } };
    }[];
    expect(updateParagraphs[0].updateParagraphStyle.range).toEqual({
      startIndex: 1,
      endIndex: 7,
    });
    expect(updateParagraphs[1].updateParagraphStyle.range).toEqual({
      startIndex: 7,
      endIndex: 14,
    });
  });

  it('handles multiple elements including headings and inline styles', () => {
    const html = '<h1>Title</h1><p>Normal <strong>bold</strong></p>';
    const requests = htmlToGDocRequests(html);

    expect(requests.length).toBe(5);

    const insertTexts = requests.filter((r) => r.insertText) as {
      insertText: { text: string; location: { index: number } };
    }[];
    expect(insertTexts[0].insertText.text).toBe('Title\n');
    expect(insertTexts[0].insertText.location.index).toBe(1);
    expect(insertTexts[1].insertText.text).toBe('Normal bold\n');
    expect(insertTexts[1].insertText.location.index).toBe(7);

    const headingStyle = requests.find(
      (r) =>
        r.updateParagraphStyle &&
        (r as { updateParagraphStyle: { paragraphStyle: { namedStyleType: string } } })
          .updateParagraphStyle.paragraphStyle.namedStyleType === 'HEADING_1'
    );
    expect(headingStyle).toBeDefined();

    const boldStyle = requests.find((r) => r.updateTextStyle) as {
      updateTextStyle: {
        range: { startIndex: number; endIndex: number };
        textStyle: { bold?: boolean };
      };
    };
    expect(boldStyle.updateTextStyle.textStyle.bold).toBe(true);
    expect(boldStyle.updateTextStyle.range).toEqual({
      startIndex: 14,
      endIndex: 18,
    });
  });

  it('generates multiple blocks and bullet requests from a <ul>', () => {
    const html = '<ul><li>First item</li><li>Second item</li></ul>';
    const requests = htmlToGDocRequests(html);

    expect(requests.length).toBe(6);

    const insertTexts = requests.filter((r) => r.insertText) as {
      insertText: { text: string; location: { index: number } };
    }[];
    expect(insertTexts).toHaveLength(2);
    expect(insertTexts[0].insertText.text).toBe('First item\n');
    expect(insertTexts[1].insertText.text).toBe('Second item\n');

    const bulletRequests = requests.filter((r) => r.createParagraphBullets) as {
      createParagraphBullets: {
        range: { startIndex: number; endIndex: number };
        bulletPreset: string;
      };
    }[];
    expect(bulletRequests).toHaveLength(2);
    bulletRequests.forEach((req) => {
      expect(req.createParagraphBullets.bulletPreset).toBe(
        'BULLET_DISC_CIRCLE_SQUARE'
      );
    });
    expect(bulletRequests[0].createParagraphBullets.range).toEqual({
      startIndex: 1,
      endIndex: 11,
    });
    expect(bulletRequests[1].createParagraphBullets.range).toEqual({
      startIndex: 12,
      endIndex: 23,
    });
  });
});
