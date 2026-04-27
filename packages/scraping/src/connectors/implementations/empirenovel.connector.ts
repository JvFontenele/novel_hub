import { fetchHtmlWithBrowser } from '../../browser/fetch-html.js';
import type { Connector, ParsedChapter, ParsedNovelData } from '../connector.interface.js';
import { decodeHtml } from './generic.connector.js';

const EMPIRE_NOVEL_HOSTS = ['empirenovel.com', 'www.empirenovel.com'];
const EMPIRE_NOVEL_BASE_URL = 'https://www.empirenovel.com';
const CHAPTER_PAGE_FETCH_CONCURRENCY = 4;

function getScraperHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': process.env.SCRAPER_USER_AGENT
      || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (process.env.SCRAPER_COOKIES_EMPIRENOVEL_COM) {
    headers.Cookie = process.env.SCRAPER_COOKIES_EMPIRENOVEL_COM;
  }

  return headers;
}

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

function resolveEmpireUrl(href: string): string {
  const decoded = decodeHtml(href).trim();
  if (decoded.startsWith('http')) {
    return decoded;
  }
  return new URL(decoded, EMPIRE_NOVEL_BASE_URL).toString();
}

function getNovelSlug(url: string): string | null {
  try {
    return new URL(url).pathname.match(/^\/novel\/([^/?#]+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMeta(html, 'og:title');
  return (
    html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1]
      ? stripTags(html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)![1])
      : null
  )
    ?? (ogTitle ? ogTitle.replace(/\s+read online\s+\|\s+Empire Novel$/i, '').trim() : null)
    ?? (html.match(/<title[^>]*>\s*([^<]+)\s*<\/title>/i)?.[1]
      ? decodeHtml(html.match(/<title[^>]*>\s*([^<]+)\s*<\/title>/i)![1])
        .replace(/\s+read online\s+\|\s+Empire Novel$/i, '')
        .trim()
      : null);
}

function extractAuthor(html: string): string | null {
  const authorMeta = extractMeta(html, 'author');
  if (authorMeta) {
    return authorMeta;
  }

  const authorBlock = html.match(/Author\s*<\/[^>]+>\s*<[^>]+>\s*([\s\S]*?)\s*<\/[^>]+>/i)
    ?? html.match(/Author[\s\S]{0,120}?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i);

  return authorBlock ? stripTags(authorBlock[1]) : null;
}

function extractSynopsis(html: string): string | null {
  const summaryBlock =
    html.match(/Summary\s*<\/[^>]+>\s*<[^>]+>\s*([\s\S]*?)\s*<\/[^>]+>/i)
    ?? html.match(/<div[^>]+class=["'][^"']*(?:summary|synopsis|description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (summaryBlock) {
    return stripTags(summaryBlock[1]);
  }

  return extractMeta(html, 'description');
}

function extractCoverUrl(html: string): string | null {
  const metaImage = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');
  if (metaImage) {
    return resolveEmpireUrl(metaImage);
  }

  const imageMatch = html.match(/<img[^>]+(?:alt=["'][^"']*cover[^"']*["'][^>]+)?src=["']([^"']+)["'][^>]*>/i);
  return imageMatch ? resolveEmpireUrl(imageMatch[1]) : null;
}

function parseStatus(html: string): ParsedNovelData['status'] {
  const statusMatch = html.match(/Status\s*<\/[^>]+>\s*<[^>]+>\s*([^<]+)\s*<\/[^>]+>/i)
    ?? html.match(/Status\s+([A-Za-z ]{3,20})/i);
  const raw = (statusMatch?.[1] ?? '').trim().toLowerCase();

  if (/complete|completed/.test(raw)) return 'COMPLETED';
  if (/hiatus/.test(raw)) return 'HIATUS';
  if (/dropped/.test(raw)) return 'DROPPED';
  if (/ongoing|on going/.test(raw)) return 'ONGOING';
  return 'UNKNOWN';
}

function parseChapterNumber(rawTitle: string, href: string): number | null {
  const fromTitle = rawTitle.match(/chapter\s+(\d+(?:\.\d+)?)/i);
  if (fromTitle) {
    return Number(fromTitle[1]);
  }

  const fromHref = href.match(/\/chapter[-/](\d+(?:\.\d+)?)(?:[-/]|$)/i)
    ?? href.match(/(?:^|[-/])chapter-(\d+(?:\.\d+)?)(?:[-/]|$)/i)
    ?? href.match(/\/novel\/[^/?#]+\/(\d+(?:\.\d+)?)(?:[/?#]|$)/i);

  return fromHref ? Number(fromHref[1]) : null;
}

function parsePublishedAt(raw: string): Date | null {
  const parsed = Date.parse(raw.trim());
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function parseChapters(html: string, novelUrl: string): ParsedChapter[] {
  const chapters = new Map<string, ParsedChapter>();
  const slug = getNovelSlug(novelUrl);
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null = null;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = decodeHtml(match[1]).trim();
    const url = resolveEmpireUrl(href);
    const rawTitle = stripTags(match[2]);
    const title = rawTitle.replace(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/, '').replace(/\s+/g, ' ').trim();
    const chapterNumber = parseChapterNumber(rawTitle, url);

    if (chapterNumber === null) {
      continue;
    }

    if (slug && !new URL(url).pathname.includes(`/novel/${slug}`)) {
      continue;
    }

    const dateWindow = html.slice(match.index, Math.min(html.length, match.index + 500));
    const dateMatch = dateWindow.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);

    chapters.set(url, {
      chapterNumber,
      title: title || `Chapter ${chapterNumber}`,
      url,
      publishedAt: dateMatch ? parsePublishedAt(dateMatch[1]) : null,
    });
  }

  return [...chapters.values()].sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function mergeChapters(chapterGroups: ParsedChapter[][]): ParsedChapter[] {
  const chapters = new Map<string, ParsedChapter>();
  for (const group of chapterGroups) {
    for (const chapter of group) {
      chapters.set(chapter.url, chapter);
    }
  }

  return [...chapters.values()].sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function parseMaxPage(html: string, novelUrl: string): number {
  const normalizedPath = new URL(novelUrl).pathname;
  const pageNumbers = [...html.matchAll(/href=["']([^"']+\?page=(\d+)[^"']*)["']/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), EMPIRE_NOVEL_BASE_URL);
        return url.pathname === normalizedPath ? Number(match[2]) : 1;
      } catch {
        return 1;
      }
    })
    .filter((page) => Number.isFinite(page) && page > 1);

  return Math.min(Math.max(1, ...pageNumbers), 200);
}

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(html);
}

function isCloudflareErrorPage(html: string): boolean {
  return /Web server is returning an unknown error|Error code 520/i.test(html);
}

async function fetchAccessibleHtml(url: string, waitForSelectors: string[]): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: getScraperHeaders(),
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    });

    const html = await response.text();
    if (response.ok && !isCloudflareBlock(html) && !isCloudflareErrorPage(html)) {
      return html;
    }
  } catch {
    // EmpireNovel often requires the browser-backed path.
  }

  const browserHtml = await fetchHtmlWithBrowser(url, {
    waitForSelectors,
    waitAfterLoadMs: 8_000,
    maxAttempts: 5,
    usePersistentContext: true,
  });

  if (isCloudflareBlock(browserHtml)) {
    throw new Error('EmpireNovel remained behind Cloudflare even in the browser-backed fetcher.');
  }

  if (isCloudflareErrorPage(browserHtml)) {
    throw new Error('EmpireNovel returned a Cloudflare 520 error page instead of the novel page.');
  }

  return browserHtml;
}

async function fetchNovelChapterPages(normalizedUrl: string, firstPageHtml: string): Promise<string[]> {
  const maxPage = parseMaxPage(firstPageHtml, normalizedUrl);
  if (maxPage <= 1) {
    return [firstPageHtml];
  }

  const pages = [firstPageHtml];
  const pageNumbers = Array.from({ length: maxPage - 1 }, (_, index) => index + 2);

  for (let index = 0; index < pageNumbers.length; index += CHAPTER_PAGE_FETCH_CONCURRENCY) {
    const batch = pageNumbers.slice(index, index + CHAPTER_PAGE_FETCH_CONCURRENCY);
    const batchPages = await Promise.all(batch.map((page) => {
      const url = `${normalizedUrl}?page=${page}`;
      return fetchAccessibleHtml(url, [
        'a.chapter_link',
        'a[href*="/novel/"]',
        '.chapter',
      ]);
    }));

    pages.push(...batchPages);
  }

  return pages;
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
    /<div[^>]+id=["']read-novel["'][^>]*>/i,
    /<div[^>]+id=["']chapter-content["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\bchapter-content\b[^"']*["'][^>]*>/i,
    /<div[^>]+class=["'][^"']*\breading-content\b[^"']*["'][^>]*>/i,
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
    throw new Error('EmpireNovel chapter content container not found on the page.');
  }

  let content = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<div[^>]+class=["'][^"']*(?:ads?|bookmark|chapter-nav|navigation)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<(?!\/?(?:p|br|em|strong|i|b)\b)[^>]+>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  content = decodeHtml(content);

  if (content.length < 100) {
    throw new Error('EmpireNovel chapter content extraction yielded too little text.');
  }

  return content;
}

export class EmpireNovelConnector implements Connector {
  key = 'empirenovel';

  canHandle(url: string): boolean {
    try {
      return EMPIRE_NOVEL_HOSTS.includes(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  normalizeUrl(url: string): string {
    const parsed = new URL(url);
    const slug = parsed.pathname.match(/^\/novel\/([^/?#]+)/i)?.[1];
    if (!slug) {
      return url;
    }

    return `${EMPIRE_NOVEL_BASE_URL}/novel/${slug}`;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const normalizedUrl = this.normalizeUrl(url);
    const html = await fetchAccessibleHtml(normalizedUrl, [
      'a.chapter_link',
      'a[href*="/novel/"]',
      '.chapter',
    ]);
    const chapterPages = await fetchNovelChapterPages(normalizedUrl, html);
    const chapters = mergeChapters(chapterPages.map((pageHtml) => parseChapters(pageHtml, normalizedUrl)));

    if (chapters.length === 0) {
      throw new Error('EmpireNovel novel page did not expose any chapters.');
    }

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
      '#read-novel',
      '#chapter-content',
      '.chapter-content',
      '.reading-content',
      '.entry-content',
      'article',
    ]);

    return extractChapterContent(html);
  }
}
