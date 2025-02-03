import * as cheerio from 'cheerio';
import type { Cheerio, AnyNode } from 'cheerio';
import type { Element, Text } from 'domhandler';

export interface DocumentBlock {
  text: string;
  paragraphStyle: { namedStyleType: string };
  inlineStyles?: Array<{
    start: number;
    end: number;
    textStyle: {
      bold?: boolean;
      italic?: boolean;
      color?: string;
      underline?: boolean;
      link?: { url: string };
    };
  }>;
  isListItem?: boolean;
  listInfo?: { ordered: boolean; nestingLevel: number };
  tableInfo?: {
    rowIndex: number;
    columnIndex: number;
    rowSpan: number;
    columnSpan: number;
  };
}

export function parseHtmlToBlocks(html: string): DocumentBlock[] {
  const $ = cheerio.load(html);
  const blocks: DocumentBlock[] = [];
  let currentNestingLevel = 0;

  function processNode($node: Cheerio<AnyNode>, nestingLevel: number = 0): void {
    $node.each((_: number, element: AnyNode) => {
      // Handle text nodes at root level
      if (element.type === 'text') {
        const text = (element as Text).data.trim();
        if (text) {
          blocks.push({
            text,
            paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }
          });
        }
        return;
      }

      if (!('tagName' in element)) return;
      
      const $element = $(element);
      const tagName = element.tagName?.toLowerCase() || '';

      switch (tagName) {
        case 'table': {
          let rowIndex = 0;
          $element.find('tr').each((_: number, row: Element) => {
            let columnIndex = 0;
            $(row).find('td').each((_: number, cell: Element) => {
              const $cell = $(cell);
              const block = createBlock($cell);
              block.tableInfo = {
                rowIndex,
                columnIndex,
                rowSpan: parseInt($cell.attr('rowspan') || '1', 10),
                columnSpan: parseInt($cell.attr('colspan') || '1', 10)
              };
              blocks.push(block);
              columnIndex++;
            });
            rowIndex++;
          });
          break;
        }
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
        case 'div': {
          const block = createBlock($element);
          blocks.push(block);
          break;
        }
        case 'ul':
        case 'ol': {
          const previousNestingLevel = currentNestingLevel;
          currentNestingLevel = nestingLevel;
          $element.children().each((_: number, child: AnyNode) => {
            if ('tagName' in child) {
              processNode($(child), nestingLevel);
            }
          });
          currentNestingLevel = previousNestingLevel;
          break;
        }
        case 'li': {
          const parent = $element.parent().get(0);
          const parentTag = parent && 'tagName' in parent ? parent.tagName.toLowerCase() : 'ul';
        
          // Clone <li> and remove nested lists only
          const $clone = $element.clone();
          $clone.children('ul, ol').remove();
        
          // Pass the trimmed clone to createBlock so it sees inline tags
          const block = createBlock($clone, true, {
            ordered: parentTag === 'ol',
            nestingLevel: currentNestingLevel
          });
        
          blocks.push(block);
        
          // Process nested lists separately
          $element.children('ul, ol').each((_: number, nestedList: Element) => {
            processNode($(nestedList), currentNestingLevel + 1);
          });
        
          break;
        }        
        case 'br': {
          // Handle <br> tags by appending a newline to the last block if it exists
          if (blocks.length > 0) {
            blocks[blocks.length - 1].text += '\n';
          }
          break;
        }
        default:
          $element.contents().each((_: number, child: AnyNode) => {
            if ('tagName' in child) {
              processNode($(child), nestingLevel);
            } else if (child.type === 'text') {
              const text = (child as Text).data.trim();
              if (text && blocks.length === 0) {
                blocks.push({
                  text,
                  paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }
                });
              }
            }
          });
      }
    });
  }

  function createBlock(
    $element: Cheerio<Element>, 
    isList: boolean = false, 
    listInfo?: { ordered: boolean; nestingLevel: number },
    textOverride?: string
  ): DocumentBlock {
    const block: DocumentBlock = {
      text: textOverride || '',
      paragraphStyle: { namedStyleType: getStyleType($element) },
      inlineStyles: []
    };

    if (isList) {
      block.isListItem = true;
      block.listInfo = listInfo;
    }

    if (!textOverride) {
      processTextContent($element, block);
    }

    if (block.inlineStyles?.length === 0) {
      delete block.inlineStyles;
    }

    return block;
  }

  function processTextContent($element: Cheerio<Element>, block: DocumentBlock): void {
    // First pass: collect text and build a map of text positions
    const textPositions = new Map<Element, { start: number; text: string }>();
    
    function collectText($el: Cheerio<Element>, currentText: string = ''): string {
      let text = currentText;
      let elementText = '';
      
      $el.contents().each((_: number, node: AnyNode) => {
        if (node.type === 'text') {
          const nodeText = (node as Text).data || '';
          text += nodeText;
          elementText += nodeText;
        } else if ('tagName' in node) {
          const $child = $(node);
          if (node.tagName.toLowerCase() === 'br') {
            text += '\n';
            elementText += '\n';
          } else {
            const startPos = text.length;
            text = collectText($child, text);
            elementText += text.slice(startPos);
          }
        }
      });

      const element = $el.get(0);
      if (element && 'tagName' in element) {
        // Store the element's exact text content without trailing spaces
        const trimmedText = elementText.replace(/\s+$/, '');
        textPositions.set(element, {
          start: currentText.length,
          text: trimmedText
        });
      }
      
      return text;
    }

    block.text = collectText($element);

    // Second pass: create inline styles using the stored positions
    function processStyles($el: Cheerio<Element>): void {
      // Process children first (innermost elements)
      $el.contents().each((_: number, node: AnyNode) => {
        if ('tagName' in node) {
          processStyles($(node));
        }
      });

      const style = getInlineStyle($el);
      const element = $el.get(0);

      if (style && element) {
        const pos = textPositions.get(element);
        if (pos) {
          // Get the text without trailing spaces
          const rightTrimmed = pos.text.replace(/\s+$/, '');
          // Get the number of leading spaces
          const leftTrimmedLength = rightTrimmed.length - rightTrimmed.trimStart().length;
          // Get the actual text content
          const textContent = rightTrimmed.trimStart();
          
          if (textContent) {
            block.inlineStyles!.push({
              start: pos.start + leftTrimmedLength,
              end: pos.start + leftTrimmedLength + textContent.length,
              textStyle: style
            });
          }
        }
      }
    }

    processStyles($element);

    // Sort styles by start position
    if (block.inlineStyles) {
      block.inlineStyles.sort((a, b) => a.start - b.start);
    }
  }

  function getStyleType($element: Cheerio<Element>): string {
    const element = $element.get(0);
    const tag = element?.tagName.toLowerCase() || 'p';
    switch (tag) {
      case 'h1': return 'HEADING_1';
      case 'h2': return 'HEADING_2';
      case 'h3': return 'HEADING_3';
      case 'h4': return 'HEADING_4';
      case 'h5': return 'HEADING_5';
      case 'h6': return 'HEADING_6';
      default: return 'NORMAL_TEXT';
    }
  }

  function getInlineStyle($element: Cheerio<Element>): {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    underline?: boolean;
    link?: { url: string };
  } | null {
    const element = $element.get(0);
    const tag = element?.tagName.toLowerCase() || '';
    const style: {
      bold?: boolean;
      italic?: boolean;
      color?: string;
      underline?: boolean;
      link?: { url: string };
    } = {};
    let hasStyle = false;

    if (tag === 'strong' || tag === 'b') {
      style.bold = true;
      hasStyle = true;
    }
    if (tag === 'em' || tag === 'i') {
      style.italic = true;
      hasStyle = true;
    }
    if (tag === 'u') {
      style.underline = true;
      hasStyle = true;
    }
    if (tag === 'a') {
      const href = $element.attr('href');
      if (href) {
        style.link = { url: href };
        hasStyle = true;
      }
    }
    if (tag === 'span') {
      const styleAttr = $element.attr('style');
      if (styleAttr) {
        const colorMatch = styleAttr.match(/color:\s*(#[0-9a-f]{6})/i);
        if (colorMatch) {
          style.color = colorMatch[1];
          hasStyle = true;
        }
      }
    }

    return hasStyle ? style : null;
  }

  processNode($('body'));
  return blocks;
}
