import { fetchHtmlWithBrowser } from '../../browser/fetch-html.js';
import type { Connector, ParsedChapter, ParsedNovelData } from '../connector.interface.js';
import { decodeHtml } from './generic.connector.js';

const NOVELBIN_HOSTS = ['novelbin.com', 'www.novelbin.com'];

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property|itemprop)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]).trim() : null;
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMeta(html, 'og:title');
  return (
    extractMeta(html, 'og:novel:novel_name')
    ?? (ogTitle ? ogTitle.replace(/\s+Novel\s+-\s+Read.+?Novel Bin$/i, '').trim() : null)
    ?? html.match(/<h3[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>\s*([^<]+)\s*<\/h3>/i)?.[1]?.trim()
    ?? null
  );
}

function extractAuthor(html: string): string | null {
  return (
    extractMeta(html, 'og:novel:author')
    ?? html.match(/Author<\/h3>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/i)?.[1]?.trim()
    ?? null
  );
}

function extractSynopsis(html: string): string | null {
  const descriptionBlock = html.match(/<div[^>]+class="[^"]*\bdesc-text\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (descriptionBlock) {
    return decodeHtml(descriptionBlock[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  }

  return extractMeta(html, 'description');
}

function extractCoverUrl(html: string): string | null {
  return extractMeta(html, 'og:image');
}

function parseStatus(html: string): ParsedNovelData['status'] {
  const raw = (extractMeta(html, 'og:novel:status') ?? '').trim().toLowerCase();
  if (raw === 'ongoing' || raw === 'on going') return 'ONGOING';
  if (raw === 'completed' || raw === 'complete') return 'COMPLETED';
  if (raw === 'hiatus') return 'HIATUS';
  if (raw === 'dropped') return 'DROPPED';
  return 'UNKNOWN';
}

function parseChapterNumber(rawTitle: string, href: string): number | null {
  const fromTitle = rawTitle.match(/chapter\s+(\d+(?:\.\d+)?)/i);
  if (fromTitle) {
    return Number(fromTitle[1]);
  }

  const fromHref = href.match(/\/chapter-(\d+(?:\.\d+)?)(?:[-/]|$)/i);
  if (fromHref) {
    return Number(fromHref[1]);
  }

  return null;
}

function parseChapters(html: string): ParsedChapter[] {
  const chapters = new Map<string, ParsedChapter>();
  const anchorPattern =
    /<a[^>]*href="(https?:\/\/novelbin\.com\/b\/[^"]+\/chapter-[^"]+)"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;

  let match: RegExpExecArray | null = null;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = decodeHtml(match[1]).trim();
    const titleAttr = decodeHtml(match[2]).trim();
    const innerText = decodeHtml(match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
    const rawTitle = innerText && !/^read now$/i.test(innerText) ? innerText : titleAttr;
    const chapterNumber = parseChapterNumber(rawTitle || titleAttr, href);
    if (chapterNumber === null) {
      continue;
    }

    const current = chapters.get(href);
    const nextChapter: ParsedChapter = {
      chapterNumber,
      title: rawTitle || titleAttr || null,
      url: href,
      publishedAt: null,
    };

    if (!current || !current.title || (current.title && /^read now$/i.test(current.title) && nextChapter.title)) {
      chapters.set(href, nextChapter);
    }
  }

  return [...chapters.values()].sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(html);
}

async function fetchAccessibleHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });

  const html = await response.text();
  if (response.ok && !isCloudflareBlock(html) && parseChapters(html).length > 1) {
    return html;
  }

  const browserHtml = await fetchHtmlWithBrowser(`${url}#tab-chapters-title`);
  if (isCloudflareBlock(browserHtml)) {
    throw new Error('NovelBin remained behind Cloudflare even in the browser-backed fetcher.');
  }

  return browserHtml;
}

export class NovelbinConnector implements Connector {
  key = 'novelbin';

  canHandle(url: string): boolean {
    try {
      return NOVELBIN_HOSTS.includes(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  normalizeUrl(url: string): string {
    const parsed = new URL(url);
    const slugMatch = parsed.pathname.match(/^\/b\/([^/]+)/i);
    if (!slugMatch) {
      return url;
    }

    return `https://novelbin.com/b/${slugMatch[1]}`;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const normalizedUrl = this.normalizeUrl(url);
    const html = await fetchAccessibleHtml(normalizedUrl);

    return {
      title: extractTitle(html),
      coverUrl: extractCoverUrl(html),
      synopsis: extractSynopsis(html),
      author: extractAuthor(html),
      status: parseStatus(html),
      chapters: parseChapters(html),
    };
  }
}
