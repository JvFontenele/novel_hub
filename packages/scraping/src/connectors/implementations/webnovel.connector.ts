import { decodeHtml } from './generic.connector.js';
import type { Connector, ParsedChapter, ParsedNovelData } from '../connector.interface.js';
import { fetchHtmlWithBrowser, launchBrowser } from '../../browser/fetch-html.js';

const WEBNOVEL_HOSTS = ['webnovel.com', 'www.webnovel.com'];

function extractMeta(html: string, name: string): string | null {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const match = html.match(pattern);
  return match ? decodeHtml(match[1]).trim() : null;
}

function parseStatus(html: string): ParsedNovelData['status'] {
  if (/completed/i.test(html)) return 'COMPLETED';
  if (/hiatus/i.test(html)) return 'HIATUS';
  if (/dropped/i.test(html)) return 'DROPPED';
  if (/ongoing|latest release/i.test(html)) return 'ONGOING';
  return 'UNKNOWN';
}

function parsePublishedAt(raw: string): Date | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const absolute = Date.parse(raw);
  if (!Number.isNaN(absolute)) {
    return new Date(absolute);
  }

  const relativeMatch = value.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/);
  if (!relativeMatch) return null;

  const amount = Number(relativeMatch[1]);
  const unit = relativeMatch[2];
  const date = new Date();

  switch (unit) {
    case 'minute':
    case 'minutes':
      date.setMinutes(date.getMinutes() - amount);
      break;
    case 'hour':
    case 'hours':
      date.setHours(date.getHours() - amount);
      break;
    case 'day':
    case 'days':
      date.setDate(date.getDate() - amount);
      break;
    case 'week':
    case 'weeks':
      date.setDate(date.getDate() - amount * 7);
      break;
    case 'month':
    case 'months':
      date.setMonth(date.getMonth() - amount);
      break;
    case 'year':
    case 'years':
      date.setFullYear(date.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return date;
}

function parseChapters(html: string): ParsedChapter[] {
  const chapters = new Map<string, ParsedChapter>();
  const latestPattern =
    /<a[^>]+class="[^"]*\blst-chapter\b[^"]*"[^>]+href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/gi;
  const listPattern =
    /<li[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>\s*<i[^>]*>\s*([\d.]+)\s*<\/i>\s*<div[^>]*>\s*<strong[^>]*>\s*([^<]+?)\s*<\/strong>\s*<small[^>]*>\s*([^<]+)\s*<\/small>/gi;

  function addChapter(chapterNumber: number, rawTitle: string, href: string, rawPublishedAt: string) {
    const title = decodeHtml(rawTitle).trim();
    const url = href.startsWith('http') ? href : `https://www.webnovel.com${decodeHtml(href).trim()}`;
    const key = `${chapterNumber}:${url}`;

    if (chapters.has(key)) {
      return;
    }

    chapters.set(key, {
      chapterNumber,
      title,
      url,
      publishedAt: parsePublishedAt(decodeHtml(rawPublishedAt).trim()),
    });
  }

  let latestMatch: RegExpExecArray | null = null;
  while ((latestMatch = latestPattern.exec(html)) !== null) {
    const rawTitle = decodeHtml(latestMatch[2]).trim();
    const chapterNumberMatch = rawTitle.match(/(\d+(?:\.\d+)?)/);
    if (!chapterNumberMatch) {
      continue;
    }

    addChapter(Number(chapterNumberMatch[1]), rawTitle, latestMatch[1], latestMatch[3]);
  }

  let listMatch: RegExpExecArray | null = null;
  while ((listMatch = listPattern.exec(html)) !== null) {
    addChapter(Number(listMatch[2]), listMatch[3], listMatch[1], listMatch[4]);
  }

  return [...chapters.values()].sort((left, right) => left.chapterNumber - right.chapterNumber);
}

function extractAuthor(html: string): string | null {
  const match = html.match(/Author:\s*<\/strong>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/i)
    ?? html.match(/Author:\s*<[^>]+>\s*([^<]+)\s*<\/a>/i)
    ?? html.match(/Author:\s*<\/div>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/i)
    ?? html.match(/Author:\s*.*?<a[^>]*>\s*([^<]+)\s*<\/a>/i);
  return match ? decodeHtml(match[1]).trim() : null;
}

function extractTitle(html: string): string | null {
  const headingMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (headingMatch) return decodeHtml(headingMatch[1]).trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? decodeHtml(titleMatch[1]).replace(/\s+Fanfic Read Free\s+-\s+WebNovel$/i, '').trim() : null;
}

function extractSynopsis(html: string): string | null {
  const metaDescription = extractMeta(html, 'description');
  return metaDescription;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractCoverUrl(html: string): string | null {
  const imageMatch = html.match(/<img[^>]+src="([^"]*bookcover[^"]+)"/i);
  if (imageMatch) {
    const src = decodeHtml(imageMatch[1]).trim();
    if (src.startsWith('//')) {
      return `https:${src}`;
    }
    if (src.startsWith('/')) {
      return `https://www.webnovel.com${src}`;
    }
    return src;
  }

  return extractMeta(html, 'twitter:image')
    ?? extractMeta(html, 'og:image')
    ?? null;
}

function isCloudflareBlock(html: string): boolean {
  return /Just a moment\.\.\.|Enable JavaScript and cookies to continue/i.test(html);
}

export class WebnovelConnector implements Connector {
  key = 'webnovel';

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return WEBNOVEL_HOSTS.includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  normalizeUrl(url: string): string {
    const parsed = new URL(url);
    const bookIdMatch =
      parsed.pathname.match(/\/book\/(\d+)(?:\/|$)/)
      ?? parsed.pathname.match(/_([0-9]{10,})(?:\/|$)/);

    if (!bookIdMatch) {
      return url;
    }

    return `https://www.webnovel.com/book/${bookIdMatch[1]}/catalog`;
  }

  async fetchNovelData(url: string): Promise<ParsedNovelData> {
    const normalizedUrl = this.normalizeUrl(url);
    const html = await this.fetchAccessibleHtml(normalizedUrl);
    const chapters = parseChapters(html);

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
    const browser = await launchBrowser();

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 1600 },
        locale: 'en-US',
      });

      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
        await page.waitForSelector('.chapter_content, .cha-content, .cha-words', { timeout: 20_000 });

        const content = await page.evaluate(() => {
          const paragraphNodes = Array.from(
            document.querySelectorAll<HTMLElement>('.cha-content .cha-paragraph, .chapter_content .cha-paragraph, .cha-words .cha-paragraph'),
          );

          const cleanedParagraphs = paragraphNodes
            .map((node) => {
              const clone = node.cloneNode(true) as HTMLElement;
              clone.querySelectorAll('i, .para-comment-num, .tag-num, .j_open_para_comment, .j_para_comment_count').forEach((el) => el.remove());
              clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));

              const parts = Array.from(clone.childNodes)
                .map((child) => {
                  if (child.nodeType === Node.TEXT_NODE) {
                    return child.textContent ?? '';
                  }

                  if (!(child instanceof HTMLElement)) {
                    return '';
                  }

                  const tag = child.tagName.toLowerCase();
                  if (tag === 'br') {
                    return '\n';
                  }

                  if (tag === 'em' || tag === 'strong' || tag === 'i' || tag === 'b') {
                    return child.outerHTML;
                  }

                  return child.textContent ?? '';
                })
                .join('')
                .replace(/\u00a0/g, ' ')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n[ \t]+/g, '\n')
                .replace(/[ \t]{2,}/g, ' ')
                .trim();

              return parts;
            })
            .filter((html) => html.length > 0);

          return cleanedParagraphs;
        });

        if (content.join('').length < 100) {
          throw new Error('Webnovel chapter content extraction yielded too little text.');
        }

        return content
          .map((paragraph) =>
            `<p>${escapeHtml(paragraph)
              .replace(/&lt;(\/?(?:em|strong|i|b))&gt;/g, '<$1>')
              .replace(/\n/g, '<br />')}</p>`,
          )
          .join('\n');
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }

  private async fetchAccessibleHtml(url: string): Promise<string> {
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
    if (response.ok && !isCloudflareBlock(html)) {
      const chapters = parseChapters(html);
      if (chapters.length > 1) {
        return html;
      }
    }

    const browserHtml = await fetchHtmlWithBrowser(url);
    if (isCloudflareBlock(browserHtml)) {
      throw new Error('Webnovel remained behind Cloudflare even in the browser-backed fetcher.');
    }

    return browserHtml;
  }
}
