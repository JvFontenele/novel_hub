export type EventType = 'NEW_CHAPTER' | 'STATUS_CHANGED' | 'NOVEL_UPDATED' | 'SOURCE_FAILED';
export type RunStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface NewChapterPayload {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string | null;
  chapterUrl: string;
}

export interface StatusChangedPayload {
  previousStatus: string;
  newStatus: string;
}

export interface SourceFailedPayload {
  errorMessage: string;
  consecutiveFailures: number;
}

export type EventPayload = NewChapterPayload | StatusChangedPayload | SourceFailedPayload | Record<string, unknown>;

export interface DomainEvent {
  id: string;
  novelId: string;
  sourceId: string | null;
  type: EventType;
  payload: EventPayload;
  createdAt: Date;
}
