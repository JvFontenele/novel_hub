import { Worker } from 'bullmq';
import { QUEUE_NAMES, type CollectSourceJobData } from '@novel-hub/shared';
import { config } from '../config.js';
import { collectSourceJob } from '../jobs/collect-source.job.js';

export function createWorker() {
  const worker = new Worker<CollectSourceJobData>(
    QUEUE_NAMES.COLLECTOR,
    collectSourceJob,
    {
      connection: { url: config.REDIS_URL },
      concurrency: config.WORKER_CONCURRENCY,
    },
  );

  worker.on('completed', (job) => {
    console.info(`[worker] job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
