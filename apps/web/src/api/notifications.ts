import { api } from './client'
import type { MarkAllNotificationsReadResponse, NotificationView } from '@novel-hub/contracts'

export const notificationsApi = {
  list: (): Promise<NotificationView[]> =>
    api.get<{ items: NotificationView[] }>('/notifications').then((r) => r.data.items),

  markRead: (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`).then(() => undefined),

  markAllRead: (): Promise<MarkAllNotificationsReadResponse> =>
    api.patch<MarkAllNotificationsReadResponse>('/notifications/read-all').then((r) => r.data),
}
