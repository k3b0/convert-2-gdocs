import type { docs_v1 } from 'googleapis';
import { ConversionError, ConverterConfig } from '../types/googleDocsTypes';
import { parseHtml, extractTextSegment, getListConfig, getParagraphStyle, isBlockElement } from '../utils/htmlParser';
import { IndexManager } from '../utils/indexManager';
import { TextAggregator } from '../utils/textAggregator';
import type { CheerioAPI } from 'cheerio';

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
    console.warn('No HTML provided for conversion.');
    return [];
  }
  try {
    console.log('Starting HTML to Google Docs conversion.');
    const $: CheerioAPI = parseHtml(html);
    const requests: docs_v1.Schema$Request[] = [];
    const indexManager = new IndexManager();
    const listIds = new Map<string, string>();
    let currentListId = 1;

    // Process each element in the body
    const rootAggregator = new TextAggregator(indexManager.getCurrentPosition().index);
    $('body').contents().each(function () {
      processNode($, $(this), requests, indexManager, listIds, currentListId, rootAggregator, config);
    });

    // Flush any remaining content
    if (rootAggregator.getBuffer()) {
      rootAggregator.trimTrailingNewlines();
      flushAggregator(rootAggregator, requests, indexManager);
    }

    return requests;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error during HTML to GDoc conversion:', error);
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
  parentAggregator: TextAggregator,
  config?: ConverterConfig
): void {
  const node = $node[0] as { type: string; name?: string; data?: string };
  if (!node) return;

  // Handle text nodes
  if (node.type === 'text') {
    const text = node.data || '';
    const isInPre = $node.parents('pre').length > 0;
    
    // Skip empty text nodes when not in pre tag
    if (!isInPre && !text.trim()) {
      return;
    }

    // Extract text segment and style information
    const segment = extractTextSegment(node, $);
    const startOffset = parentAggregator.getLength();
    
    // Append text to aggregator
    parentAggregator.append(text);
    
    // Add formatting range if there are styles
    if (segment.style && Object.keys(segment.style).length > 0) {
      const endOffset = parentAggregator.getLength();
      if (endOffset > startOffset) {
        parentAggregator.addFormattingRange(
          startOffset,
          endOffset,
          {
            ...segment.style,
            ...config?.defaultTextStyle
          }
        );
      }
    }
    return;
  }

  // Skip non-tag nodes or nodes without a 'name' property
  if (node.type !== 'tag' || !('name' in node)) {
    return;
  }
  const tagName = (node as { name: string }).name.toLowerCase();

  // Handle lists
  if (tagName === 'ul' || tagName === 'ol') {
    // Flush any existing text before starting the list
    if (parentAggregator.getBuffer()) {
      parentAggregator.trimTrailingNewlines();
      flushAggregator(parentAggregator, requests, indexManager);
    }
    
    const listConfig = getListConfig($node[0]);
    if (listConfig) {
      const listKey = `${tagName}-${listConfig.nestingLevel}`;
      if (!listIds.has(listKey)) {
        listIds.set(listKey, `list-${currentListId++}`);
      }
      listConfig.listId = listIds.get(listKey);

      // Process each list item
      $node.children('li').each(function (index) {
        const $li = $(this);
        const itemAggregator = new TextAggregator(indexManager.getCurrentPosition().index);
        
        // Process the list item's content (excluding nested lists)
        $li.contents().each(function () {
          if (!$(this).is('ul, ol')) {
            processNode($, $(this), requests, indexManager, listIds, currentListId, itemAggregator, config);
          }
        });

        // Get indices before flushing
        const startIndex = indexManager.getCurrentPosition().index;
        
        // Mark block boundary for list items
        itemAggregator.markBlockBoundary();
        
        // Trim trailing newlines before applying styles
        itemAggregator.trimTrailingNewlines();
        flushAggregator(itemAggregator, requests, indexManager);
        
        const endIndex = indexManager.getCurrentPosition().index;

        if (endIndex > startIndex) {
          // Apply bullet formatting
          requests.push({
            createParagraphBullets: {
              range: { startIndex, endIndex },
              bulletPreset: listConfig.nestingLevel === 1 ? 'BULLET_DISC_CIRCLE_SQUARE' : 'BULLET_DISC',
            },
          });

          // Apply indentation
          requests.push({
            updateParagraphStyle: {
              range: { startIndex, endIndex },
              paragraphStyle: {
                indentStart: { magnitude: listConfig.nestingLevel * 36, unit: 'PT' },
                indentFirstLine: { magnitude: listConfig.nestingLevel * 36, unit: 'PT' }
              },
              fields: 'indentStart,indentFirstLine'
            }
          });
        }

        // Process any nested lists
        $li.children('ul, ol').each(function () {
          processNode($, $(this), requests, indexManager, listIds, currentListId, itemAggregator, config);
        });
      });

      return;
    }
  }

  // Process block elements
  if (isBlockElement($node[0])) {
    // Create a new aggregator for this block
    const blockAggregator = new TextAggregator(
      indexManager.getCurrentPosition().index,
      { preserveWhitespace: tagName === 'pre' }
    );
    
    // Process block contents
    let hasContent = false;
    $node.contents().each(function () {
      const content = $(this).text().trim();
      if (content || $(this).children().length > 0) {
        hasContent = true;
        processNode($, $(this), requests, indexManager, listIds, currentListId, blockAggregator, config);
      }
    });

    if (hasContent) {
      // Get indices before flushing
      const startIndex = indexManager.getCurrentPosition().index;
      
      // Mark block boundary
      blockAggregator.markBlockBoundary();
      
      // Trim trailing newlines before applying styles
      blockAggregator.trimTrailingNewlines();
      flushAggregator(blockAggregator, requests, indexManager);
      
      const endIndex = indexManager.getCurrentPosition().index;
      
      // Apply block style
      const style = getParagraphStyle($node[0], $);
      const combinedStyle = {
        ...style,
        ...(config?.defaultParagraphStyle || {})
      };
      
      requests.push({
        updateParagraphStyle: {
          paragraphStyle: combinedStyle,
          range: { startIndex, endIndex },
          fields: '*',
        },
      });
    }
  } else {
    // Process inline elements
    const segment = extractTextSegment($node[0], $);
    const startOffset = parentAggregator.getLength();
    
    // Process children first
    if ($node.contents().length > 0) {
      $node.contents().each(function () {
        processNode($, $(this), requests, indexManager, listIds, currentListId, parentAggregator, config);
      });
    } else if (segment.text) {
      parentAggregator.append(segment.text);
    }

    // Apply inline styles if any
    if (segment.style && Object.keys(segment.style).length > 0) {
      const endOffset = parentAggregator.getLength();
      if (endOffset > startOffset) {
        parentAggregator.addFormattingRange(
          startOffset,
          endOffset,
          {
            ...segment.style,
            ...config?.defaultTextStyle
          }
        );
      }
    }
  }
}

/**
 * Helper function to flush the text aggregator and create the necessary requests
 */
function flushAggregator(
  aggregator: TextAggregator,
  requests: docs_v1.Schema$Request[],
  indexManager: IndexManager
): void {
  const buffer = aggregator.getBuffer();
  if (!buffer) return;

  // Create text insertion request
  requests.push({
    insertText: {
      location: { index: aggregator.getStartIndex() },
      text: buffer
    }
  });

  // Create style update requests for formatting ranges
  for (const range of aggregator.getFormattingRanges()) {
    requests.push({
      updateTextStyle: {
        textStyle: range.style,
        range: {
          startIndex: aggregator.getStartIndex() + range.startIndex,
          endIndex: aggregator.getStartIndex() + range.endIndex
        },
        fields: '*'
      }
    });
  }

  // Update index manager
  indexManager.advance(buffer);

  // Flush the aggregator
  aggregator.flush();
}