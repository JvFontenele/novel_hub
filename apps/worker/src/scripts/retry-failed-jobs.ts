import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '@novel-hub/shared';
import { config } from '../config.js';

type RetryMode = 'chapter-content' | 'all';

function parseMode(): RetryMode {
  const rawMode = process.argv[2]?.trim().toLowerCase();
  return rawMode === 'all' ? 'all' : 'chapter-content';
}

async function main() {
  const mode = parseMode();
  const queue = new Queue(QUEUE_NAMES.COLLECTOR, {
    connection: { url: config.REDIS_URL },
  });

  try {
    const jobs = await queue.getJobs(['failed'], 0, 5000, true);

    let retried = 0;
    let skipped = 0;

    for (const job of jobs) {
      const shouldRetry =
        mode === 'all' || job.name === JOB_NAMES.FETCH_CHAPTER_CONTENT;

      if (!shouldRetry) {
        skipped++;
        continue;
      }

      await job.retry();
      retried++;
    }

    console.info(
      JSON.stringify(
        {
          queue: QUEUE_NAMES.COLLECTOR,
          mode,
          totalFailed: jobs.length,
          retried,
          skipped,
        },
        null,
        2,
      ),
    );
  } finally {
    await queue.close();
  }
}

main().catch((error) => {
  console.error('[retry-failed-jobs] failed:', error);
  process.exit(1);
});
