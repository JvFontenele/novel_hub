import { Worker, type Job } from 'bullmq';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  type CollectSourceJobData,
  type FetchChapterContentJobData,
} from '@novel-hub/shared';
import { config } from '../config.js';
import { collectSourceJob } from '../jobs/collect-source.job.js';
import { fetchChapterContentJob } from '../jobs/fetch-chapter-content.job.js';

type WorkerJobData = CollectSourceJobData | FetchChapterContentJobData;

async function processJob(job: Job<WorkerJobData>) {
  switch (job.name) {
    case JOB_NAMES.COLLECT_SOURCE:
      return collectSourceJob(job as Job<CollectSourceJobData>);
    case JOB_NAMES.FETCH_CHAPTER_CONTENT:
      return fetchChapterContentJob(job as Job<FetchChapterContentJobData>);
    default:
      throw new Error(`Unsupported job name: ${job.name}`);
  }
}

export function createWorker() {
  const worker = new Worker<WorkerJobData>(
    QUEUE_NAMES.COLLECTOR,
    processJob,
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
