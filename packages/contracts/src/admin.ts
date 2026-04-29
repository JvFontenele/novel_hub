export type CollectorRunStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface CollectorRunView {
  id: string;
  sourceId: string;
  sourceUrl: string;
  status: CollectorRunStatus;
  chaptersFound: number;
  chaptersNew: number;
  errorMessage: string | null;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface SourceFailureView {
  sourceId: string;
  sourceUrl: string;
  novelTitle: string;
  status: string;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
}

export interface ScraperSettingView {
  hostname: string;
  hasCookies: boolean;
  cookies: string | null;
  cookiesPreview: string | null;
  userAgent: string | null;
  updatedAt: string;
}

export interface UpsertScraperSettingInput {
  hostname: string;
  cookies?: string | null;
  userAgent?: string | null;
}
