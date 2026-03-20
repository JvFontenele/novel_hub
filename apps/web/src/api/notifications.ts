import { api } from './client'
import { mockNotificationsApi } from './mock'
import type { Notification } from '@/types'

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true'

export const notificationsApi = {
  list: (): Promise<Notification[]> =>
    IS_MOCK
      ? mockNotificationsApi.list()
      : api.get<{ items: Notification[] }>('/notifications').then((r) => r.data.items),

  markRead: (id: string): Promise<void> =>
    IS_MOCK
      ? mockNotificationsApi.markRead(id)
      : api.patch(`/notifications/${id}/read`).then(() => undefined),
}
