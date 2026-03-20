import { fetch } from 'undici';
import type { Connector, ParsedNovelData } from '../connector.interface.js';

export class GenericConnector implements Connector {
  key = 'generic';

  canHandle(_url: string): boolean {
    return true;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NovelHubBot/1.0)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const html = await response.text();

    // Extract title from <title> tag as a minimal placeholder
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Generic connector returns empty chapters - real parsing is connector-specific
    return {
      title,
      coverUrl: null,
      synopsis: null,
      author: null,
      status: 'UNKNOWN',
      chapters: [],
    };
  }
}
