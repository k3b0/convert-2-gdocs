import * as cheerio from 'cheerio';
import { TextSegment, ListConfig, ConversionError } from '../types/googleDocsTypes';
import type { docs_v1 } from 'googleapis';

type NodeType = {
  type: string;
  name?: string;
  data?: string;
};

/**
 * Parse HTML string into a Cheerio API instance.
 * @param html The HTML string to parse.
 * @returns CheerioAPI instance.
 */
export function parseHtml(html: string): cheerio.CheerioAPI {
  try {
    return cheerio.load(html);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConversionError(`Failed to parse HTML: ${errorMessage}`);
  }
}

/**
 * Extract text content and style information from a node.
 * @param node The node to process.
 * @param $ The Cheerio API instance.
 * @returns A TextSegment object.
 */
export function extractTextSegment(node: any, $: cheerio.CheerioAPI): TextSegment {
  const $node = $(node);
  const text = $node.text() || '';
  const style: docs_v1.Schema$TextStyle = {};

  const tagName = (node.name || '').toLowerCase();
  if (tagName === 'strong' || tagName === 'b') {
    style.bold = true;
  }
  if (tagName === 'em' || tagName === 'i') {
    style.italic = true;
  }
  if (tagName === 'u') {
    style.underline = true;
  }

  const styleAttr = $node.attr('style');
  if (styleAttr) {
    const styles = parseStyleAttribute(styleAttr);
    Object.assign(style, styles);
  }

  return { text, style };
}

/**
 * Parse a style attribute string into a partial TextStyle object.
 * @param styleAttr The style attribute string.
 * @returns Partial TextStyle object.
 */
function parseStyleAttribute(styleAttr: string): Partial<docs_v1.Schema$TextStyle> {
  const style: Partial<docs_v1.Schema$TextStyle> = {};
  const declarations = styleAttr.split(';').filter(Boolean);

  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    switch (property) {
      case 'color':
        style.foregroundColor = { color: { rgbColor: hexToRgb(value) } };
        break;
      case 'background-color':
        style.backgroundColor = { color: { rgbColor: hexToRgb(value) } };
        break;
      case 'font-family':
        style.weightedFontFamily = { fontFamily: value };
        break;
      case 'font-size':
        if (value.endsWith('pt')) {
          style.fontSize = { magnitude: parseInt(value), unit: 'PT' };
        }
        break;
    }
  }
  return style;
}

/**
 * Convert a hex color string to an RGB color object.
 * @param hex The hex color string.
 * @returns An object with red, green, and blue values.
 */
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const num = parseInt(hex, 16);
  return {
    red: ((num >> 16) & 255) / 255,
    green: ((num >> 8) & 255) / 255,
    blue: (num & 255) / 255
  };
}

/**
 * Get list configuration for a node representing a list.
 * @param node The node to process.
 * @returns A ListConfig object or null.
 */
export function getListConfig(node: any): ListConfig | null {
  const name = node.name?.toLowerCase();
  if (name !== 'ul' && name !== 'ol') {
    return null;
  }

  let nestingLevel = 0;
  let parent = node.parent;
  while (parent) {
    if (parent.name === 'ul' || parent.name === 'ol') {
      nestingLevel++;
    }
    parent = parent.parent;
  }

  return {
    nestingLevel,
    ordered: name === 'ol',
    listId: undefined
  };
}

/**
 * Get paragraph style based on a node.
 * @param node The node to process.
 * @param $ The Cheerio API instance.
 * @returns A ParagraphStyle object.
 */
export function getParagraphStyle(node: any, $: cheerio.CheerioAPI): docs_v1.Schema$ParagraphStyle {
  const style: docs_v1.Schema$ParagraphStyle = {};
  const tagName = (node.name || '').toLowerCase();

  switch (tagName) {
    case 'h1':
      style.namedStyleType = 'HEADING_1';
      break;
    case 'h2':
      style.namedStyleType = 'HEADING_2';
      break;
    case 'h3':
      style.namedStyleType = 'HEADING_3';
      break;
    case 'h4':
      style.namedStyleType = 'HEADING_4';
      break;
    case 'h5':
      style.namedStyleType = 'HEADING_5';
      break;
    case 'h6':
      style.namedStyleType = 'HEADING_6';
      break;
    default:
      style.namedStyleType = 'NORMAL_TEXT';
  }

  const $node = $(node);
  const styleAttr = $node.attr('style');
  if (styleAttr) {
    const alignMatch = /text-align:\s*(left|center|right|justify)/i.exec(styleAttr);
    if (alignMatch) {
      switch (alignMatch[1].toLowerCase()) {
        case 'left':
          style.alignment = 'START';
          break;
        case 'center':
          style.alignment = 'CENTER';
          break;
        case 'right':
          style.alignment = 'END';
          break;
        case 'justify':
          style.alignment = 'JUSTIFIED';
          break;
      }
    }
  }

  return style;
}

/**
 * Determine if a node is a block-level element.
 * @param node The node to check.
 * @returns True if block-level, false otherwise.
 */
export function isBlockElement(node: any): boolean {
  const blockElements = new Set([
    'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div',
    'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'ol',
    'p', 'pre', 'section', 'table', 'ul'
  ]);
  return blockElements.has((node.name || '').toLowerCase());
}