import type { Connector, ParsedNovelData } from '../connector.interface.js';

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.text();
}

export class GenericConnector implements Connector {
  key = 'generic';

  canHandle(_url: string): boolean {
    return true;
  }

  normalizeUrl(url: string): string {
    return url;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const html = await fetchHtml(this.normalizeUrl(url));

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtml(titleMatch[1]).trim() : null;

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

export function decodeHtml(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
