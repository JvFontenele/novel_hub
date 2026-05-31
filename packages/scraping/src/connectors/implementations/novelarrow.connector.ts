import { fetchHtmlWithBrowser } from '../../browser/fetch-html.js';
import type { Connector, ParsedChapter, ParsedNovelData } from '../connector.interface.js';
import { decodeHtml } from './generic.connector.js';

const NOVELARROW_HOSTS = ['novelarrow.com', 'www.novelarrow.com'];
const NOVELARROW_BASE_URL = 'https://novelarrow.com';

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property|itemprop)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]).trim() : null;
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMeta(html, 'og:title');
  if (ogTitle) {
    return ogTitle.replace(/\s*[-|–—]\s*(?:NovelArrow|Read Online).*$/i, '').trim();
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    return stripTags(h1Match[1]);
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    return decodeHtml(titleMatch[1])
      .replace(/\s*[-|–—]\s*(?:NovelArrow|Read Online).*$/i, '')
      .trim();
  }

  return null;
}

function extractAuthor(html: string): string | null {
  const patterns = [
    /Author\s*<\/[^>]+>\s*<[^>]+>\s*([\s\S]*?)\s*<\/[^>]+>/i,
    /Author[\s\S]{0,80}?<a[^>]*>\s*([^<]+)\s*<\/a>/i,
    /<span[^>]+(?:class|itemprop)=["'][^"']*\bauthor\b[^"']*["'][^>]*>([^<]+)<\/span>/i,
    /"author"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return stripTags(match[1]);
    }
  }

  return null;
}

function extractSynopsis(html: string): string | null {
  const containerPatterns = [
    /<div[^>]+class=["'][^"']*(?:description|synopsis|summary)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*(?:description|synopsis|summary)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /Summary\s*<\/[^>]+>\s*<[^>]+>([\s\S]*?)<\/[^>]+>/i,
  ];

  for (const pattern of containerPatterns) {
    const match = html.match(pattern);
    if (match) {
      const text = stripTags(match[1]);
      if (text.length > 20) {
        return text;
      }
    }
  }

  return (
    extractMeta(html, 'description')
    ?? extractMeta(html, 'og:description')
    ?? null
  );
}

function extractCoverUrl(html: string): string | null {
  return extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image') ?? null;
}

function parseStatus(html: string): ParsedNovelData['status'] {
  const statusMatch =
    html.match(/Status\s*<\/[^>]+>\s*<[^>]+>\s*([^<]{3,20})\s*<\/[^>]+>/i)
    ?? html.match(/Status\s*:\s*([A-Za-z ]{3,20})/i);

  const raw = (statusMatch?.[1] ?? '').trim().toLowerCase();

  if (/complet/.test(raw)) return 'COMPLETED';
  if (/hiatus/.test(raw)) return 'HIATUS';
  if (/dropped/.test(raw)) return 'DROPPED';
  if (/ongoing|on.?going|active/.test(raw)) return 'ONGOING';
  return 'UNKNOWN';
}

function getNovelSlug(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return (
      pathname.match(/^\/novel\/([^/?#]+)/i)?.[1]
      ?? pathname.match(/^\/chapter\/([^/?#/]+)\//i)?.[1]
      ?? null
    );
  } catch {
    return null;
  }
}

function parseChapterNumber(rawTitle: string, href: string): number | null {
  const fromTitle = rawTitle.match(/chapter\s+(\d+(?:\.\d+)?)/i);
  if (fromTitle) {
    return Number(fromTitle[1]);
  }

  const fromHref =
    href.match(/\/chapter-(\d+(?:\.\d+)?)/i)
    ?? href.match(/[/-](\d+(?:\.\d+)?)(?:[/-]|$)/i);

  return fromHref ? Number(fromHref[1]) : null;
}

function parseChapters(html: string, novelSlug: string): ParsedChapter[] {
  const chapters = new Map<string, ParsedChapter>();
  const chapterPathPattern = `/chapter/${novelSlug}/`;
  const anchorPattern =
    /<a[^>]+href=["']((?:https?:\/\/(?:www\.)?novelarrow\.com)?\/chapter\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null = null;
  while ((match = anchorPattern.exec(html)) !== null) {
    const rawHref = decodeHtml(match[1]).trim();
    if (!rawHref.includes(chapterPathPattern)) {
      continue;
    }

    const href = rawHref.startsWith('http') ? rawHref : `${NOVELARROW_BASE_URL}${rawHref}`;
    const rawTitle = stripTags(match[2]);
    const chapterNumber = parseChapterNumber(rawTitle, href);

    if (chapterNumber === null) {
      continue;
    }

    if (!chapters.has(href)) {
      chapters.set(href, {
        chapterNumber,
        title: rawTitle || `Chapter ${chapterNumber}`,
        url: href,
        publishedAt: null,
      });
    }
  }

  return [...chapters.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(html);
}

function extractDivContent(html: string, openTag: RegExp): string | null {
  const startMatch = openTag.exec(html);
  if (!startMatch) return null;

  let depth = 1;
  let pos = startMatch.index + startMatch[0].length;

  while (pos < html.length && depth > 0) {
    const openIdx = html.indexOf('<div', pos);
    const closeIdx = html.indexOf('</div', pos);

    if (closeIdx === -1) break;

    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      pos = openIdx + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(startMatch.index + startMatch[0].length, closeIdx);
      pos = closeIdx + 6;
    }
  }

  return null;
}

function extractChapterContent(html: string): string {
  const selectors = [
    /<div[^>]+id=["']chapter-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bchapter-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+id=["']chr-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bchr-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+id=["']reading-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\breading-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+id=["']content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>/i,
    /<article[^>]*>/i,
  ];

  let raw: string | null = null;
  for (const selector of selectors) {
    raw = selector.source.startsWith('<article')
      ? html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? null
      : extractDivContent(html, selector);
    if (raw) break;
  }

  if (!raw) {
    throw new Error('NovelArrow chapter content container not found on the page.');
  }

  let content = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(
      /<div[^>]+class=["'][^"']*(?:ads?|bookmark|chapter-nav|navigation|protect)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      '',
    )
    .replace(/<(?!\/?(?:p|br|em|strong|i|b)\b)[^>]+>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  content = decodeHtml(content);

  if (content.length < 100) {
    throw new Error('NovelArrow chapter content extraction yielded too little text.');
  }

  return content;
}

async function fetchAccessibleHtml(url: string, waitForSelectors: string[]): Promise<string> {
  const browserHtml = await fetchHtmlWithBrowser(url, {
    waitForSelectors,
    waitAfterLoadMs: 4_000,
    maxAttempts: 4,
    usePersistentContext: true,
  });

  if (isCloudflareBlock(browserHtml)) {
    throw new Error('NovelArrow remained behind Cloudflare even in the browser-backed fetcher.');
  }

  return browserHtml;
}

export class NovelArrowConnector implements Connector {
  key = 'novelarrow';

  canHandle(url: string): boolean {
    try {
      return NOVELARROW_HOSTS.includes(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  normalizeUrl(url: string): string {
    const slug = getNovelSlug(url);
    if (!slug) return url;
    return `${NOVELARROW_BASE_URL}/novel/${slug}`;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const normalizedUrl = this.normalizeUrl(url);
    const slug = getNovelSlug(normalizedUrl);

    if (!slug) {
      throw new Error(`Cannot extract novel slug from URL: ${url}`);
    }

    const html = await fetchAccessibleHtml(normalizedUrl, [
      `a[href*="/chapter/${slug}/"]`,
      '.chapter-list',
      '.list-chapter',
      '.chapters',
    ]);

    const chapters = parseChapters(html, slug);

    return {
      title: extractTitle(html),
      coverUrl: extractCoverUrl(html),
      synopsis: extractSynopsis(html),
      author: extractAuthor(html),
      status: parseStatus(html),
      chapters,
    };
  }

  async fetchChapterContent(url: string): Promise<string> {
    const html = await fetchAccessibleHtml(url, [
      '#chapter-content',
      '.chapter-content',
      '#chr-content',
      '.chr-content',
      '#reading-content',
      '.reading-content',
      'article',
    ]);

    return extractChapterContent(html);
  }
}
