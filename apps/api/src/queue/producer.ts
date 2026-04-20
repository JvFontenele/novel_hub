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

const PENDING_CHAPTER_JOB_STATES = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);

interface EnqueueCollectOptions {
  delayMs?: number;
  jobId?: string;
  requestedByUserId?: string;
}

export async function enqueueCollect(sourceId: string, options: EnqueueCollectOptions = {}) {
  const { delayMs = 0, jobId = sourceId, requestedByUserId } = options;

  return collectorQueue.add(
    JOB_NAMES.COLLECT_SOURCE,
    { sourceId, requestedByUserId } satisfies CollectSourceJobData,
    {
      jobId,
      delay: delayMs,
    },
  );
}

interface EnqueueFetchChapterContentOptions {
  jobId?: string;
  requestedByUserId?: string;
}

export function getChapterContentJobId(chapterId: string) {
  return `chapter-content-${chapterId}`;
}

export function getManualChapterContentJobId(chapterId: string) {
  return `${getChapterContentJobId(chapterId)}-manual-${Date.now()}`;
}

export async function hasPendingChapterContentJob(chapterId: string) {
  const job = await collectorQueue.getJob(getChapterContentJobId(chapterId));
  if (!job) {
    return false;
  }

  const state = await job.getState();
  return PENDING_CHAPTER_JOB_STATES.has(state);
}

export async function enqueueFetchChapterContent(
  novelId: string,
  chapterId: string,
  options: EnqueueFetchChapterContentOptions = {},
) {
  const { jobId = getChapterContentJobId(chapterId), requestedByUserId } = options;

  return collectorQueue.add(
    JOB_NAMES.FETCH_CHAPTER_CONTENT,
    { novelId, chapterId, requestedByUserId } satisfies FetchChapterContentJobData,
    { jobId },
  );
}
