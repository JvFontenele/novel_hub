import { fetchHtmlWithBrowser } from '../../browser/fetch-html.js';
import { getScraperCookieHeaderForUrl, getScraperUserAgent } from '../../runtime-config.js';
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

function buildFallbackChapterTitle(chapterNumber: number): string {
  return Number.isInteger(chapterNumber) ? `Chapter ${chapterNumber}` : `Chapter ${chapterNumber}`;
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

  const firstReadUrl = extractMeta(html, 'og:novel:read_url');
  if (firstReadUrl) {
    const normalizedUrl = decodeHtml(firstReadUrl).trim();
    const chapterNumber = parseChapterNumber('', normalizedUrl);

    if (chapterNumber !== null && !chapters.has(normalizedUrl)) {
      chapters.set(normalizedUrl, {
        chapterNumber,
        title: buildFallbackChapterTitle(chapterNumber),
        url: normalizedUrl,
        publishedAt: null,
      });
    }
  }

  return [...chapters.values()].sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function hasUsableChapterList(html: string): boolean {
  const chapters = parseChapters(html);
  if (chapters.length < 25) {
    return false;
  }

  const firstChapter = chapters[0]?.chapterNumber ?? 0;
  const lastChapter = chapters[chapters.length - 1]?.chapterNumber ?? 0;
  return firstChapter <= 1 && lastChapter - firstChapter + 1 >= Math.min(chapters.length, 25);
}

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(html);
}

const NOVELBIN_CHAPTER_CONTENT_SELECTORS = [
  '#chr-content',
  '.chr-content',
  '#chapter-content',
  '.chapter-content',
  '.reading-content',
];

async function getScraperHeaders(url: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'User-Agent': await getScraperUserAgent(new URL(url).hostname),
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };
  const cookieHeader = await getScraperCookieHeaderForUrl(url);
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  return headers;
}

async function fetchAccessibleHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: await getScraperHeaders(url),
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });

  const html = await response.text();
  if (response.ok && !isCloudflareBlock(html) && hasUsableChapterList(html)) {
    return html;
  }

  const browserHtml = await fetchHtmlWithBrowser(`${url}#tab-chapters-title`, {
    waitForSelectors: ['a[href*="/chapter-"]'],
    waitForStableSelector: 'a[href*="/chapter-"]',
    stableSelectorMinCount: 10,
    stableSelectorIdleMs: 8_000,
    stableSelectorTimeoutMs: 90_000,
    waitAfterLoadMs: 8_000,
    maxAttempts: 4,
    usePersistentContext: true,
  });
  if (isCloudflareBlock(browserHtml)) {
    throw new Error('NovelBin remained behind Cloudflare even in the browser-backed fetcher.');
  }

  return browserHtml;
}

async function fetchChapterHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: await getScraperHeaders(url),
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    });

    const html = await response.text();
    if (response.ok && !isCloudflareBlock(html) && /(?:#chr-content|class=["'][^"']*(?:chr-content|chapter-content|reading-content))/i.test(html)) {
      return html;
    }
  } catch {
    // Fall back to the browser-backed fetcher below.
  }

  const browserHtml = await fetchHtmlWithBrowser(url, {
    waitForSelectors: NOVELBIN_CHAPTER_CONTENT_SELECTORS,
    waitAfterLoadMs: 4_000,
    maxAttempts: 4,
    usePersistentContext: true,
  });
  if (isCloudflareBlock(browserHtml)) {
    throw new Error('NovelBin remained behind Cloudflare even in the browser-backed fetcher.');
  }

  return browserHtml;
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
    /<div[^>]+id=["']chr-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bchr-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+id=["']chapter-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bchapter-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\breading-content\b[^"']*["'][^>]*>/i,
  ];

  let raw: string | null = null;
  for (const selector of selectors) {
    raw = extractDivContent(html, selector);
    if (raw) break;
  }

  if (!raw) {
    throw new Error('Chapter content container not found on the page.');
  }

  // Strip noise
  let content = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '')
    .replace(/<div[^>]+class=["'][^"']*\bads?\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div[^>]+id=["'][^"']*\bads?\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

  // Keep only safe inline tags, strip the rest but preserve text
  content = content
    .replace(/<(?!\/?(?:p|br|em|strong|i|b)\b)[^>]+>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  content = decodeHtml(content);

  if (content.length < 100) {
    throw new Error('Chapter content extraction yielded too little text — selector may have changed.');
  }

  return content;
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

  async fetchChapterContent(url: string): Promise<string> {
    const html = await fetchChapterHtml(url);
    return extractChapterContent(html);
  }
}
