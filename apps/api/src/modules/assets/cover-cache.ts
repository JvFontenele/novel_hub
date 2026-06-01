import { getCoverData, saveCoverData } from '../novels/novels.repository.js';

const ALLOWED_HOSTS = new Set([
  'book-pic.webnovel.com',
  'cc-cdnintserviceimg.webnovel.com',
  'webbanner.webnovel.com',
  'images.novelbin.com',
  'www.empirenovel.com',
]);

function isAllowedCoverUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function getReferer(hostname: string): string {
  if (hostname.endsWith('webnovel.com')) return 'https://www.webnovel.com/';
  if (hostname === 'images.novelbin.com') return 'https://novelbin.com/';
  return `https://${hostname}/`;
}

export async function downloadCover(url: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!isAllowedCoverUrl(url)) return null;
  try {
    const hostname = new URL(url).hostname;
    const res = await fetch(url, {
      headers: {
        'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: getReferer(hostname),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const data = Buffer.from(await res.arrayBuffer());
    return { data, contentType };
  } catch {
    return null;
  }
}

export async function cacheCover(novelId: string, coverUrl: string | null): Promise<void> {
  if (!coverUrl) return;
  const cover = await downloadCover(coverUrl);
  if (cover) {
    await saveCoverData(novelId, cover.data, cover.contentType);
  }
}

export async function serveCover(
  novelId: string,
  coverUrl: string | null,
): Promise<{ data: Buffer; contentType: string } | null> {
  const cached = await getCoverData(novelId);
  if (cached?.data) {
    return { data: cached.data, contentType: cached.contentType ?? 'image/jpeg' };
  }

  if (!coverUrl) return null;
  const cover = await downloadCover(coverUrl);
  if (cover) {
    // cache asynchronously — don't block the response
    saveCoverData(novelId, cover.data, cover.contentType).catch(() => {});
    return cover;
  }
  return null;
}
