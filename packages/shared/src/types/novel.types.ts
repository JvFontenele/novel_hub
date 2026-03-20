export type NovelStatus = 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'DROPPED' | 'UNKNOWN';
export type SourceStatus = 'MONITORING' | 'PAUSED' | 'FAILED' | 'DEAD';

export interface Novel {
  id: string;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  author: string | null;
  status: NovelStatus;
  lastChapterNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NovelSource {
  id: string;
  novelId: string;
  url: string;
  canonicalUrl: string | null;
  connectorKey: string;
  status: SourceStatus;
  monitoringEnabled: boolean;
  checkIntervalMin: number;
  lastCheckedAt: Date | null;
  nextCheckAt: Date | null;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  novelId: string;
  lastReadChapterNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}
