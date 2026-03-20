import { api } from './client'
import type {
  ChapterListItem,
  CreateNovelInput,
  CreateNovelResponse,
  NovelDetail,
  NovelEventView,
  NovelListItem,
  PaginatedResponse,
  ToggleSourceMonitoringInput,
  TriggerSourceCollectionResponse,
  UpdateProgressResponse,
} from '@novel-hub/contracts'

export const novelsApi = {
  list: (): Promise<NovelListItem[]> =>
    api.get<{ items: NovelListItem[] }>('/novels').then((r) => r.data.items),

  get: (novelId: string): Promise<NovelDetail> =>
    api.get<NovelDetail>(`/novels/${novelId}`).then((r) => r.data),

  create: (data: CreateNovelInput): Promise<CreateNovelResponse> =>
    api.post<CreateNovelResponse>('/novels', data).then((r) => r.data),

  updateProgress: (novelId: string, lastReadChapterNumber: number): Promise<UpdateProgressResponse> =>
    api.patch<UpdateProgressResponse>(`/novels/${novelId}/progress`, { lastReadChapterNumber }).then((r) => r.data),

  chapters: (novelId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<ChapterListItem>> =>
    api
      .get<PaginatedResponse<ChapterListItem>>(`/novels/${novelId}/chapters`, { params: { page, pageSize } })
      .then((r) => r.data),

  events: (novelId: string): Promise<NovelEventView[]> =>
    api.get<{ items: NovelEventView[] }>(`/novels/${novelId}/events`).then((r) => r.data.items),

  toggleSource: (sourceId: string, monitoringEnabled: boolean) =>
    api.patch(`/sources/${sourceId}`, { monitoringEnabled } satisfies ToggleSourceMonitoringInput).then((r) => r.data),

  collectSourceNow: (sourceId: string): Promise<TriggerSourceCollectionResponse> =>
    api.post<TriggerSourceCollectionResponse>(`/sources/${sourceId}/collect`).then((r) => r.data),
}
