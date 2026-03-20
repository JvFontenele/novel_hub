import { sql } from '../db/client.js';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES, type CollectSourceJobData } from '@novel-hub/shared';
import { config } from '../config.js';

export function startScheduler() {
  const queue = new Queue(QUEUE_NAMES.COLLECTOR, {
    connection: { url: config.REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  const tick = async () => {
    try {
      const sources = await sql`
        SELECT id
        FROM novel_sources
        WHERE monitoring_enabled = TRUE
          AND status != 'DEAD'
          AND status != 'FAILED'
          AND (next_check_at IS NULL OR next_check_at <= NOW())
      `;

      for (const source of sources) {
        await queue.add(
          JOB_NAMES.COLLECT_SOURCE,
          { sourceId: source.id } satisfies CollectSourceJobData,
          { jobId: source.id },
        );
      }

      if (sources.length > 0) {
        console.info(`[scheduler] enqueued ${sources.length} source(s)`);
      }
    } catch (err) {
      console.error('[scheduler] tick error:', err);
    }
  };

  // Run immediately then every minute
  tick();
  const interval = setInterval(tick, 60_000);

  return {
    stop: () => {
      clearInterval(interval);
      return queue.close();
    },
  };
}
