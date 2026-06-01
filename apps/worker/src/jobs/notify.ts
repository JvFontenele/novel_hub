import { sql } from '../db/client.js';

export function isFinalAttempt(job: { attemptsMade: number; opts: { attempts?: number } }): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
}

/**
 * Inserts a notification for a specific user, or for all novel subscribers
 * when requestedByUserId is null/undefined.
 */
export async function insertNotification(params: {
  requestedByUserId: string | null | undefined;
  novelId: string;
  eventId: string;
  type: string;
  title: string;
  body: string;
}) {
  const { requestedByUserId, novelId, eventId, type, title, body } = params;

  if (requestedByUserId) {
    await sql`
      INSERT INTO notifications (user_id, novel_id, event_id, type, title, body)
      VALUES (${requestedByUserId}, ${novelId}, ${eventId}, ${type}, ${title}, ${body})
    `;
  } else {
    await sql`
      INSERT INTO notifications (user_id, novel_id, event_id, type, title, body)
      SELECT s.user_id, ${novelId}, ${eventId}, ${type}, ${title}, ${body}
      FROM subscriptions s
      WHERE s.novel_id = ${novelId}
    `;
  }
}
