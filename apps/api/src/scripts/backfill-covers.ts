import postgres from 'postgres';
import { config } from '../config.js';

const sql = postgres(config.DATABASE_URL, { max: 1 });

async function main() {
  const novels = await sql<{ id: string; title: string; coverUrl: string }[]>`
    SELECT id, title, cover_url AS "coverUrl"
    FROM novels
    WHERE cover_url IS NOT NULL AND cover_data IS NULL
  `;

  console.log(`[backfill-covers] ${novels.length} novels sem capa em cache`);

  for (const novel of novels) {
    try {
      const res = await fetch(novel.coverUrl, {
        headers: {
          'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        console.warn(`  SKIP ${novel.title} — HTTP ${res.status}`);
        continue;
      }

      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      const data = Buffer.from(await res.arrayBuffer());

      await sql`
        UPDATE novels
        SET cover_data = ${data}, cover_content_type = ${contentType}
        WHERE id = ${novel.id}
      `;

      console.log(`  OK   ${novel.title} (${(data.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.warn(`  ERR  ${novel.title} — ${(err as Error).message}`);
    }
  }

  console.log('[backfill-covers] concluído');
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
