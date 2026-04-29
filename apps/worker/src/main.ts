import { createWorker } from './queue/consumer.js';
import { startScheduler } from './scheduler/source-scheduler.js';
import { sql } from './db/client.js';
import { setScraperRuntimeSettingsProvider } from '@novel-hub/scraping';

function normalizeHostname(hostname: string) {
  return hostname.trim().replace(/^www\./i, '').toLowerCase();
}

async function start() {
  console.info('[worker] starting...');

  setScraperRuntimeSettingsProvider(async (hostname) => {
    const normalized = hostname.trim().toLowerCase();
    const withoutWww = normalizeHostname(hostname);
    const [settings] = await sql`
      SELECT cookies, user_agent AS "userAgent"
      FROM scraper_settings
      WHERE hostname IN ${sql([normalized, withoutWww])}
      ORDER BY CASE WHEN hostname = ${normalized} THEN 0 ELSE 1 END
      LIMIT 1
    `;

    return settings
      ? { cookies: settings.cookies ?? null, userAgent: settings.userAgent ?? null }
      : null;
  });

  const worker = createWorker();
  const scheduler = startScheduler();

  const shutdown = async (signal: string) => {
    console.info(`[worker] received ${signal}, shutting down...`);
    await Promise.all([
      worker.close(),
      scheduler.stop(),
      sql.end(),
    ]);
    console.info('[worker] shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.info('[worker] ready');
}

start().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
