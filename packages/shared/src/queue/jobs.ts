export const QUEUE_NAMES = {
  COLLECTOR: 'collector',
} as const;

export const JOB_NAMES = {
  COLLECT_SOURCE: 'COLLECT_SOURCE',
  FETCH_CHAPTER_CONTENT: 'FETCH_CHAPTER_CONTENT',
} as const;

export interface CollectSourceJobData {
  sourceId: string;
}

export interface FetchChapterContentJobData {
  novelId: string;
  chapterId: string;
}
