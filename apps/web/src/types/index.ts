export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Novel {
  novelId: string
  title: string
  coverUrl?: string
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
  lastChapterNumber: number
  lastReadChapterNumber: number
}

export interface NovelSource {
  sourceId: string
  url: string
  monitoringEnabled: boolean
  lastFetchedAt?: string
}

export interface NovelDetail extends Novel {
  sources: NovelSource[]
}

export interface Chapter {
  chapterId: string
  number: number
  title?: string
  url: string
  publishedAt: string
}

export interface NovelEvent {
  eventId: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface Notification {
  id: string
  type: string
  novelId: string
  title: string
  read: boolean
  createdAt: string
}

export interface CollectorRun {
  id: string
  sourceId: string
  sourceUrl: string
  status: 'SUCCESS' | 'FAILURE' | 'RUNNING'
  chaptersFound: number
  durationMs: number
  ranAt: string
  error?: string
}

export interface SourceFailure {
  sourceId: string
  sourceUrl: string
  novelTitle: string
  failureCount: number
  lastFailureAt: string
  lastError: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total?: number
  page?: number
  pageSize?: number
}
