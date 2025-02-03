import { describe, it, expect } from 'vitest';
import { parseHtmlToBlocks } from './parseHtmlToBlocks';

describe('parseHtmlToBlocks', () => {
  it('parses a simple <p> into one DocumentBlock', () => {
    const html = '<p>Hello World</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Hello World');
    expect(blocks[0].paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
  });

  it('parses <h1> ... <h6> as blocks with heading styles', () => {
    const headings = [
      { html: '<h1>Title 1</h1>', style: 'HEADING_1' },
      { html: '<h2>Title 2</h2>', style: 'HEADING_2' },
      { html: '<h3>Title 3</h3>', style: 'HEADING_3' },
      { html: '<h4>Title 4</h4>', style: 'HEADING_4' },
      { html: '<h5>Title 5</h5>', style: 'HEADING_5' },
      { html: '<h6>Title 6</h6>', style: 'HEADING_6' },
    ];

    headings.forEach(({ html, style }) => {
      const blocks = parseHtmlToBlocks(html);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].text).toBe(`Title ${style.slice(-1)}`);
      expect(blocks[0].paragraphStyle).toEqual({ namedStyleType: style });
    });
  });

  it('creates inlineStyles for <strong> or <b> elements', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Hello World');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 6,
      end: 11,
      textStyle: { bold: true }
    });
  });

  it('creates inlineStyles for nested elements (e.g., <strong> and <em>)', () => {
    const html = '<p>Nested <strong>bold and <em>italic</em></strong> text</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Nested bold and italic text');
    expect(blocks[0].inlineStyles).toHaveLength(2);
    // Bold style for "bold and italic"
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 7,
      end: 22,
      textStyle: { bold: true }
    });
    // Italic style for "italic"
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 16,
      end: 22,
      textStyle: { italic: true }
    });
  });

  it('parses <ul> with multiple <li> items into DocumentBlocks', () => {
    const html = '<ul><li>First item</li><li>Second item</li></ul>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(2);
    blocks.forEach((block, index) => {
      expect(block.isListItem).toBe(true);
      expect(block.listInfo).toEqual({ ordered: false, nestingLevel: 0 });
      expect(block.text).toBe(index === 0 ? 'First item' : 'Second item');
    });
  });

  it('parses nested lists with correct nesting levels', () => {
    const html = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      text: 'Parent',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: false, nestingLevel: 0 }
    });
    expect(blocks[1]).toEqual({
      text: 'Child',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: false, nestingLevel: 1 }
    });
  });

  it('parses <span style="color:#ff0000"> and extracts color style', () => {
    const html = '<p>Color <span style="color:#ff0000;">Red Text</span> Normal</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Color Red Text Normal');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 6,
      end: 14,
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
    });
  });
});

it('parses plain text outside of any tag as a DocumentBlock', () => {
  const html = 'Just some plain text';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toBe('Just some plain text');
  expect(blocks[0].paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
});

it('parses multiple <p> tags into separate DocumentBlocks', () => {
  const html = '<p>First paragraph</p><p>Second paragraph</p>';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(2);
  expect(blocks[0].text).toBe('First paragraph');
  expect(blocks[1].text).toBe('Second paragraph');
});

it('parses a <div> element as a block-level element with NORMAL_TEXT style', () => {
  const html = '<div>A div element</div>';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toBe('A div element');
  expect(blocks[0].paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
});

it('correctly handles sibling inline elements with different styles', () => {
  const html = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toBe('This is bold and italic text.');
  expect(blocks[0].inlineStyles).toHaveLength(2);
});

it('merges inline styles for nested <strong> and <span style="color:#0000ff"> elements', () => {
  const html = '<p><strong>Bold <span style="color:#0000ff;">Blue</span> Bold</strong></p>';
  const blocks = parseHtmlToBlocks(html);

  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toBe('Bold Blue Bold');
  expect(blocks[0].inlineStyles).toHaveLength(2);

  expect(blocks[0].inlineStyles).toContainEqual({
    start: 0,
    end: 14,
    textStyle: { bold: true }
  });

  expect(blocks[0].inlineStyles).toContainEqual({
    start: 5,
    end: 9,
    textStyle: {
      foregroundColor: {
        color: {
          rgbColor: {
            red: 0,
            green: 0,
            blue: 1
          }
        }
      }
    }
  });
});

describe('br tag handling', () => {
  it('parses <br> tags as line breaks within a block', () => {
    const html = '<p>Line 1<br>Line 2</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Line 1\nLine 2');
  });

  it('handles <br> with inline styles around it', () => {
    const html = '<p><strong>Bold<br>Text</strong></p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Bold\nText');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 0,
      end: 9,
      textStyle: { bold: true }
    });
  });

  it('handles multiple <br> tags', () => {
    const html = '<p>Line 1<br><br>Line 2</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Line 1\n\nLine 2');
  });

  it('handles <br> at start and end of block', () => {
    const html = '<p><br>Line 1<br></p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('\nLine 1\n');
  });

  it('handles <br> with inline styles spanning across it', () => {
    const html = '<p><span style="color:#ff0000">Red<br>Text</span></p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Red\nText');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 0,
      end: 8,
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
    });
  });
});

describe('text formatting', () => {
  it('handles underline text', () => {
    const html = '<p>This is <u>underlined</u> text</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('This is underlined text');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 8,
      end: 18,
      textStyle: { underline: true }
    });
  });

  it('handles nested underline with other styles', () => {
    const html = '<p><strong>Bold and <u>underlined</u></strong> text</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Bold and underlined text');
    expect(blocks[0].inlineStyles).toHaveLength(2);
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 0,
      end: 19,
      textStyle: { bold: true }
    });
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 9,
      end: 19,
      textStyle: { underline: true }
    });
  });
});

describe('ordered lists', () => {
  it('parses basic ordered list', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(2);
    blocks.forEach((block, index) => {
      expect(block.isListItem).toBe(true);
      expect(block.listInfo).toEqual({ ordered: true, nestingLevel: 0 });
      expect(block.text).toBe(index === 0 ? 'First' : 'Second');
    });
  });

  it('handles nested ordered and unordered lists', () => {
    const html = '<ol><li>First<ul><li>Sub unordered</li></ul></li><li>Second</li></ol>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      text: 'First',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: true, nestingLevel: 0 }
    });
    expect(blocks[1]).toEqual({
      text: 'Sub unordered',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: false, nestingLevel: 1 }
    });
    expect(blocks[2]).toEqual({
      text: 'Second',
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
      isListItem: true,
      listInfo: { ordered: true, nestingLevel: 0 }
    });
  });
});

describe('hyperlinks', () => {
  it('parses simple hyperlink', () => {
    const html = '<p>Visit <a href="https://example.com">Example</a> site</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Visit Example site');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 6,
      end: 13,
      textStyle: { link: { url: 'https://example.com' } }
    });
  });

  it('handles links with other inline styles', () => {
    const html = '<p><strong><a href="https://example.com">Bold Link</a></strong></p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Bold Link');
    expect(blocks[0].inlineStyles).toHaveLength(2);
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 0,
      end: 9,
      textStyle: { bold: true }
    });
    expect(blocks[0].inlineStyles).toContainEqual({
      start: 0,
      end: 9,
      textStyle: { link: { url: 'https://example.com' } }
    });
  });
});

describe('tables', () => {
  it('parses simple 2x2 table', () => {
    const html = `
      <table>
        <tr>
          <td>Cell 1,1</td>
          <td>Cell 1,2</td>
        </tr>
        <tr>
          <td>Cell 2,1</td>
          <td>Cell 2,2</td>
        </tr>
      </table>
    `;
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(4);
    const expectedTexts = ['Cell 1,1', 'Cell 1,2', 'Cell 2,1', 'Cell 2,2'];
    blocks.forEach((block, i) => {
      expect(block.text).toBe(expectedTexts[i]);
      expect(block.tableInfo).toBeDefined();
      expect(block.tableInfo).toEqual({
        rowIndex: Math.floor(i / 2),
        columnIndex: i % 2,
        rowSpan: 1,
        columnSpan: 1
      });
    });
  });

  it('handles table with inline styles', () => {
    const html = `
      <table>
        <tr>
          <td><strong>Bold</strong></td>
          <td><u>Underline</u></td>
        </tr>
      </table>
    `;
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe('Bold');
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 0,
      end: 4,
      textStyle: { bold: true }
    });
    expect(blocks[1].text).toBe('Underline');
    expect(blocks[1].inlineStyles![0]).toEqual({
      start: 0,
      end: 9,
      textStyle: { underline: true }
    });
    blocks.forEach((block, i) => {
      expect(block.tableInfo).toEqual({
        rowIndex: 0,
        columnIndex: i,
        rowSpan: 1,
        columnSpan: 1
      });
    });
  });
});

it('returns an empty array for an empty HTML string', () => {
  const html = '';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(0);
});

it('parses an empty <p> as a DocumentBlock with empty text', () => {
  const html = '<p></p>';
  const blocks = parseHtmlToBlocks(html);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].text).toBe('');
  expect(blocks[0].paragraphStyle).toEqual({ namedStyleType: 'NORMAL_TEXT' });
});

describe('Additional edge cases', () => {
  it('clamps inline style range correctly when inline element is followed by extra text', () => {
    const html = '<p>Hello <strong>World</strong>!!!</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Hello World!!!');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 6,
      end: 11,
      textStyle: { bold: true }
    });
  });

  it('handles inline styles inside list items', () => {
    const html = '<ul><li>Item with <em>italic</em> style</li></ul>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Item with italic style');
    expect(blocks[0].isListItem).toBe(true);
    expect(blocks[0].listInfo).toEqual({ ordered: false, nestingLevel: 0 });
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 10,
      end: 16,
      textStyle: { italic: true }
    });
  });

  it('trims inline style whitespace correctly', () => {
    const html = '<p>Hello <strong>  World  </strong>!</p>';
    const blocks = parseHtmlToBlocks(html);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Hello   World  !');
    expect(blocks[0].inlineStyles).toHaveLength(1);
    expect(blocks[0].inlineStyles![0]).toEqual({
      start: 8,
      end: 13,
      textStyle: { bold: true }
    });
  });
});