import { api } from './client'
import { mockNovelsApi } from './mock'
import type { Novel, NovelDetail, Chapter, NovelEvent, PaginatedResponse } from '@/types'

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true'

export const novelsApi = {
  list: (): Promise<Novel[]> =>
    IS_MOCK ? mockNovelsApi.list() : api.get<{ items: Novel[] }>('/novels').then((r) => r.data.items),

  get: (novelId: string): Promise<NovelDetail> =>
    IS_MOCK ? mockNovelsApi.get(novelId) : api.get<NovelDetail>(`/novels/${novelId}`).then((r) => r.data),

  create: (data: { sourceUrl: string; displayName: string }) =>
    IS_MOCK
      ? mockNovelsApi.create(data)
      : api.post<{ novelId: string; sourceId: string; status: string }>('/novels', data).then((r) => r.data),

  updateProgress: (novelId: string, lastReadChapterNumber: number) =>
    IS_MOCK
      ? mockNovelsApi.updateProgress(novelId, lastReadChapterNumber)
      : api.patch(`/novels/${novelId}/progress`, { lastReadChapterNumber }).then((r) => r.data),

  chapters: (novelId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Chapter>> =>
    IS_MOCK
      ? mockNovelsApi.chapters(novelId)
      : api
          .get<PaginatedResponse<Chapter>>(`/novels/${novelId}/chapters`, { params: { page, pageSize } })
          .then((r) => r.data),

  events: (novelId: string): Promise<NovelEvent[]> =>
    IS_MOCK
      ? mockNovelsApi.events(novelId)
      : api.get<{ items: NovelEvent[] }>(`/novels/${novelId}/events`).then((r) => r.data.items),

  toggleSource: (sourceId: string, monitoringEnabled: boolean) =>
    IS_MOCK
      ? mockNovelsApi.toggleSource(sourceId, monitoringEnabled)
      : api.patch(`/sources/${sourceId}`, { monitoringEnabled }).then((r) => r.data),
}
