import { createWorker } from './queue/consumer.js';
import { startScheduler } from './scheduler/source-scheduler.js';
import { sql } from './db/client.js';

async function start() {
  console.info('[worker] starting...');

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
