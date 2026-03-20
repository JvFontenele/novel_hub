import { api } from './client'
import type { NotificationView } from '@novel-hub/contracts'

export const notificationsApi = {
  list: (): Promise<NotificationView[]> =>
    api.get<{ items: NotificationView[] }>('/notifications').then((r) => r.data.items),

  markRead: (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`).then(() => undefined),
}
