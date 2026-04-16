import { api } from './client'
import type {
  ChapterContent,
  ChapterListItem,
  CreateNovelInput,
  CreateNovelResponse,
  DeleteChapterContentResponse,
  DeleteNovelResponse,
  NovelDetail,
  NovelEventView,
  NovelListItem,
  PaginatedResponse,
  QueueAllChapterContentResponse,
  QueueChapterContentResponse,
  ToggleSourceMonitoringInput,
  TriggerSourceCollectionResponse,
  UpdateProgressResponse,
} from '@novel-hub/contracts'

export function getCoverImageUrl(coverUrl: string | null) {
  if (!coverUrl) return null
  return `/api/v1/assets/cover?url=${encodeURIComponent(coverUrl)}`
}

export type ChapterOrder = 'asc' | 'desc'

export const novelsApi = {
  list: (): Promise<NovelListItem[]> =>
    api.get<{ items: NovelListItem[] }>('/novels').then((r) => r.data.items),

  get: (novelId: string): Promise<NovelDetail> =>
    api.get<NovelDetail>(`/novels/${novelId}`).then((r) => r.data),

  create: (data: CreateNovelInput): Promise<CreateNovelResponse> =>
    api.post<CreateNovelResponse>('/novels', data).then((r) => r.data),

  updateProgress: (novelId: string, lastReadChapterNumber: number): Promise<UpdateProgressResponse> =>
    api.patch<UpdateProgressResponse>(`/novels/${novelId}/progress`, { lastReadChapterNumber }).then((r) => r.data),

  remove: (novelId: string): Promise<DeleteNovelResponse> =>
    api.delete<DeleteNovelResponse>(`/novels/${novelId}`).then((r) => r.data),

  chapters: (novelId: string, page = 1, pageSize = 20, order: ChapterOrder = 'desc'): Promise<PaginatedResponse<ChapterListItem>> =>
    api
      .get<PaginatedResponse<ChapterListItem>>(`/novels/${novelId}/chapters`, { params: { page, pageSize, order } })
      .then((r) => r.data),

  events: (novelId: string): Promise<NovelEventView[]> =>
    api.get<{ items: NovelEventView[] }>(`/novels/${novelId}/events`).then((r) => r.data.items),

  toggleSource: (sourceId: string, monitoringEnabled: boolean) =>
    api.patch(`/sources/${sourceId}`, { monitoringEnabled } satisfies ToggleSourceMonitoringInput).then((r) => r.data),

  triggerSourceCollection: (sourceId: string): Promise<TriggerSourceCollectionResponse> =>
    api.post<TriggerSourceCollectionResponse>(`/sources/${sourceId}/collect`).then((r) => r.data),

  fetchChapterContent: (novelId: string, chapterId: string): Promise<QueueChapterContentResponse> =>
    api
      .post<QueueChapterContentResponse>(`/novels/${novelId}/chapters/${chapterId}/content`)
      .then((r) => r.data),

  fetchAllChapterContent: (novelId: string): Promise<QueueAllChapterContentResponse> =>
    api
      .post<QueueAllChapterContentResponse>(`/novels/${novelId}/chapters/content`)
      .then((r) => r.data),

  reprocessChapterContent: (novelId: string, chapterId: string): Promise<QueueChapterContentResponse> =>
    api
      .post<QueueChapterContentResponse>(`/novels/${novelId}/chapters/${chapterId}/content/reprocess`)
      .then((r) => r.data),

  deleteChapterContent: (novelId: string, chapterId: string): Promise<DeleteChapterContentResponse> =>
    api
      .delete<DeleteChapterContentResponse>(`/novels/${novelId}/chapters/${chapterId}/content`)
      .then((r) => r.data),

  getChapterContent: (novelId: string, chapterId: string): Promise<ChapterContent> =>
    api
      .get<ChapterContent>(`/novels/${novelId}/chapters/${chapterId}/content`)
      .then((r) => r.data),
}
