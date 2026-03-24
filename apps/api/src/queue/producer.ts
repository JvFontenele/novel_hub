import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  type CollectSourceJobData,
  type FetchChapterContentJobData,
} from '@novel-hub/shared';
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

interface EnqueueCollectOptions {
  delayMs?: number;
  jobId?: string;
}

export async function enqueueCollect(sourceId: string, options: EnqueueCollectOptions = {}) {
  const { delayMs = 0, jobId = sourceId } = options;

  return collectorQueue.add(
    JOB_NAMES.COLLECT_SOURCE,
    { sourceId } satisfies CollectSourceJobData,
    {
      jobId,
      delay: delayMs,
    },
  );
}

interface EnqueueFetchChapterContentOptions {
  jobId?: string;
}

export async function enqueueFetchChapterContent(
  novelId: string,
  chapterId: string,
  options: EnqueueFetchChapterContentOptions = {},
) {
  const { jobId = `chapter-content-${chapterId}` } = options;

  return collectorQueue.add(
    JOB_NAMES.FETCH_CHAPTER_CONTENT,
    { novelId, chapterId } satisfies FetchChapterContentJobData,
    { jobId },
  );
}
