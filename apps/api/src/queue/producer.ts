import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES, type CollectSourceJobData } from '@novel-hub/shared';
import { config } from '../config.js';

const collectorQueue = new Queue(QUEUE_NAMES.COLLECTOR, {
  connection: { url: config.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export async function enqueueCollect(sourceId: string, delayMs = 0) {
  return collectorQueue.add(
    JOB_NAMES.COLLECT_SOURCE,
    { sourceId } satisfies CollectSourceJobData,
    {
      jobId: sourceId,
      delay: delayMs,
    },
  );
}
