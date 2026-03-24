export type NovelStatus = 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'DROPPED' | 'UNKNOWN';
export type SourceStatus = 'MONITORING' | 'PAUSED' | 'FAILED' | 'DEAD';
export type NovelEventType = 'NEW_CHAPTER' | 'STATUS_CHANGED' | 'NOVEL_UPDATED' | 'SOURCE_FAILED';

export interface NovelListItem {
  novelId: string;
  title: string;
  coverUrl: string | null;
  status: NovelStatus;
  lastChapterNumber: number | null;
  lastReadChapterNumber: number | null;
}

export interface NovelSourceView {
  sourceId: string;
  url: string;
  status: SourceStatus;
  monitoringEnabled: boolean;
  lastCheckedAt: string | null;
}

export interface NovelDetail extends NovelListItem {
  synopsis: string | null;
  author: string | null;
  sources: NovelSourceView[];
}

export interface ChapterListItem {
  chapterId: string;
  chapterNumber: number;
  title: string | null;
  url: string;
  publishedAt: string | null;
  createdAt: string;
  hasContent: boolean;
}

export interface ChapterContent {
  chapterId: string;
  chapterNumber: number;
  title: string | null;
  content: string;
  contentFetchedAt: string;
  url: string;
}

export interface QueueChapterContentResponse {
  queued: true;
  chapterId: string;
}

export interface QueueAllChapterContentResponse {
  queued: true;
  totalChapters: number;
}

export interface DeleteChapterContentResponse {
  removed: true;
  chapterId: string;
}

export interface NovelEventView {
  eventId: string;
  type: NovelEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CreateNovelInput {
  sourceUrl: string;
  displayName: string;
}

export interface CreateNovelResponse {
  novelId: string;
  sourceId: string;
  status: SourceStatus;
}

export interface UpdateProgressInput {
  lastReadChapterNumber: number;
}

export interface UpdateProgressResponse {
  novelId: string;
  lastReadChapterNumber: number | null;
}

export interface DeleteNovelResponse {
  removed: true;
  novelId: string;
}

export interface ToggleSourceMonitoringInput {
  monitoringEnabled: boolean;
}

export interface TriggerSourceCollectionResponse {
  queued: true;
  sourceId: string;
}
