import { sql } from '../db/client.js';

export async function cacheCover(novelId: string, coverUrl: string): Promise<void> {
  try {
    const res = await fetch(coverUrl, {
      headers: {
        'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const data = Buffer.from(await res.arrayBuffer());
    await sql`
      UPDATE novels
      SET cover_data = ${data}, cover_content_type = ${contentType}
      WHERE id = ${novelId} AND cover_data IS NULL
    `;
  } catch {
    // non-critical — silently ignore
  }
}
