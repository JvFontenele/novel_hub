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

export interface ToggleSourceMonitoringInput {
  monitoringEnabled: boolean;
}
