export const QUEUE_NAMES = {
  COLLECTOR: 'collector',
} as const;

export const JOB_NAMES = {
  COLLECT_SOURCE: 'COLLECT_SOURCE',
} as const;

export interface CollectSourceJobData {
  sourceId: string;
}
