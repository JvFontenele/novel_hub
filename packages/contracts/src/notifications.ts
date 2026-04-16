import type { NovelEventType } from './novels.js';

export interface NotificationView {
  id: string;
  type: NovelEventType;
  novelId: string | null;
  novelTitle: string | null;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export interface MarkNotificationReadResponse {
  id: string;
}

export interface MarkAllNotificationsReadResponse {
  updatedCount: number;
}
