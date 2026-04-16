import { sql } from '../../db/client.js';

export async function listNotifications(userId: string) {
  return sql`
    SELECT
      notif.id,
      notif.type,
      notif.novel_id AS "novelId",
      novels.title AS "novelTitle",
      notif.title,
      notif.body,
      notif.read,
      notif.created_at AS "createdAt"
    FROM notifications notif
    LEFT JOIN novels ON novels.id = notif.novel_id
    WHERE notif.user_id = ${userId}
    ORDER BY notif.created_at DESC
    LIMIT 50
  `;
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const [notif] = await sql`
    UPDATE notifications
    SET read = TRUE
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `;
  return notif ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await sql`
    UPDATE notifications
    SET read = TRUE
    WHERE user_id = ${userId} AND read = FALSE
  `;

  return result.count;
}
