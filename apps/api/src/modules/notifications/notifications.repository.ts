import { sql } from '../../db/client.js';

export async function listNotifications(userId: string) {
  return sql`
    SELECT
      id,
      type,
      novel_id AS "novelId",
      title,
      body,
      read,
      created_at AS "createdAt"
    FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
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
