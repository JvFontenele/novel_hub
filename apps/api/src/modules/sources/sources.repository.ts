import { sql } from '../../db/client.js';

export async function findSourceById(sourceId: string) {
  const [source] = await sql`SELECT * FROM novel_sources WHERE id = ${sourceId}`;
  return source ?? null;
}

export async function findSourceByIdForUser(sourceId: string, userId: string) {
  const [source] = await sql`
    SELECT ns.*
    FROM novel_sources ns
    JOIN subscriptions s ON s.novel_id = ns.novel_id
    WHERE ns.id = ${sourceId} AND s.user_id = ${userId}
  `;
  return source ?? null;
}

export async function updateSourceMonitoring(sourceId: string, monitoringEnabled: boolean) {
  const newStatus = monitoringEnabled ? 'MONITORING' : 'PAUSED';
  const [source] = await sql`
    UPDATE novel_sources
    SET monitoring_enabled = ${monitoringEnabled},
        status = ${newStatus}::source_status,
        updated_at = NOW()
    WHERE id = ${sourceId}
    RETURNING *
  `;
  return source ?? null;
}
