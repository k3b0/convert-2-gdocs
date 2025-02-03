import { parseHtmlToBlocks } from '../parse/parseHtmlToBlocks';
import { blocksToRequests } from '../generate/blocksToRequests';

export function htmlToGDocRequests(html: string) {
  const blocks = parseHtmlToBlocks(html);
  return blocksToRequests(blocks);
}