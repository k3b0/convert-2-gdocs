import { parseHtmlToBlocks } from '../parse/parseHtmlToBlocks';
import { blocksToRequests } from '../generate/blocksToRequests';
import { docs_v1 } from 'googleapis';

export class GoogleDocConverter {
  convertToHtml(html: string): docs_v1.Schema$Request[] {
    const blocks = parseHtmlToBlocks(html);
    return blocksToRequests(blocks);
  }
}