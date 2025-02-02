import type { docs_v1 } from 'googleapis';
import { ConversionError, ConverterConfig } from '../types/googleDocsTypes';
import { parseHtml, extractTextSegment, getListConfig, getParagraphStyle, isBlockElement } from '../utils/htmlParser';
import { IndexManager } from '../utils/indexManager';
import type { CheerioAPI } from 'cheerio';

type NodeType = {
  type: string;
  name?: string;
  data?: string;
};

/**
 * Convert HTML string to Google Docs API requests using Cheerio.
 * @param html The HTML string to convert.
 * @param config Optional conversion configuration.
 * @returns Array of Google Docs API requests.
 */
export function htmlToGDocRequests(
  html: string,
  config?: ConverterConfig
): docs_v1.Schema$Request[] {
  if (!html) {
    return [];
  }
  try {
    const $: CheerioAPI = parseHtml(html);
    const requests: docs_v1.Schema$Request[] = [];
    const indexManager = new IndexManager();
    const listIds = new Map<string, string>();
    let currentListId = 1;

    // Process each element in the body
    $('body').contents().each(function(_, node) {
      processNode($, $(this), requests, indexManager, listIds, currentListId, config);
    });

    return requests;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConversionError(`Failed to convert HTML to Google Docs requests: ${errorMessage}`);
  }
}

/**
 * Recursively process a node to generate corresponding Google Docs API requests.
 */
function processNode(
  $: CheerioAPI,
  $node: ReturnType<typeof $>,
  requests: docs_v1.Schema$Request[],
  indexManager: IndexManager,
  listIds: Map<string, string>,
  currentListId: number,
  config?: ConverterConfig
): void {
  const node = $node[0] as NodeType;
  if (!node) return;

  // Handle text nodes
  if (node.type === 'text') {
    const text = $node.text().trim();
    if (text) {
      const position = indexManager.getCurrentPosition();
      requests.push({
        insertText: {
          location: { index: position.index },
          text,
        },
      });
      indexManager.advance(text);
    }
    return;
  }

  // Skip non-tag nodes
  if (node.type !== 'tag') {
    return;
  }

  const tagName = (node.name || '').toLowerCase();

  // Handle lists for 'ul' or 'ol'
  if (tagName === 'ul' || tagName === 'ol') {
    const listConfig = getListConfig($node[0]);
    if (listConfig) {
      const listKey = `${tagName}-${listConfig.nestingLevel}`;
      if (!listIds.has(listKey)) {
        listIds.set(listKey, `list-${currentListId++}`);
      }
      listConfig.listId = listIds.get(listKey);
    }
  }

  // Process block elements
  if (isBlockElement($node[0])) {
    const startIndex = indexManager.getCurrentPosition().index;
    $node.contents().each(function() {
      processNode($, $(this), requests, indexManager, listIds, currentListId, config);
    });
    const endIndex = indexManager.getCurrentPosition().index;
    if (endIndex > startIndex) {
      const style = getParagraphStyle($node[0], $);
      requests.push({
        updateParagraphStyle: {
          paragraphStyle: { ...style, ...config?.defaultParagraphStyle },
          range: { startIndex, endIndex },
          fields: '*',
        },
      });
      if (tagName === 'li') {
        const parent = $node.parent();
        const parentNode = parent[0] as NodeType;
        if (parentNode && (parentNode.name === 'ul' || parentNode.name === 'ol')) {
          const listConfig = getListConfig(parent[0]);
          if (listConfig && listConfig.listId) {
            requests.push({
              createParagraphBullets: {
                range: { startIndex, endIndex },
                bulletPreset: listConfig.ordered ? 'NUMBERED_DECIMAL_NESTED' : 'BULLET_DISC_CIRCLE_SQUARE',
              },
            });
          }
        }
      }
    }
  } else {
    // Process inline elements
    const segment = extractTextSegment($node[0], $);
    if (segment.text) {
      const position = indexManager.getCurrentPosition();
      requests.push({
        insertText: {
          location: { index: position.index },
          text: segment.text,
        },
      });
      if (segment.style && Object.keys(segment.style).length > 0) {
        const endIndex = indexManager.peekNextPosition(segment.text).index;
        requests.push({
          updateTextStyle: {
            textStyle: { ...segment.style, ...config?.defaultTextStyle },
            range: { startIndex: position.index, endIndex },
            fields: '*',
          },
        });
      }
      indexManager.advance(segment.text);
    }
  }
}