import { sql } from '../../db/client.js';

export async function listCollectorRuns(limit = 50) {
  return sql`
    SELECT
      cr.id,
      cr.source_id AS "sourceId",
      ns.url AS "sourceUrl",
      cr.status,
      cr.chapters_found AS "chaptersFound",
      cr.chapters_new AS "chaptersNew",
      cr.error_message AS "errorMessage",
      cr.duration_ms AS "durationMs",
      cr.started_at AS "startedAt",
      cr.finished_at AS "finishedAt"
    FROM collector_runs cr
    JOIN novel_sources ns ON ns.id = cr.source_id
    ORDER BY cr.started_at DESC
    LIMIT ${limit}
  `;
}

export async function listSourceFailures() {
  return sql`
    SELECT
      ns.id AS "sourceId",
      ns.url AS "sourceUrl",
      n.title AS "novelTitle",
      ns.status,
      ns.consecutive_failures AS "consecutiveFailures",
      ns.last_checked_at AS "lastCheckedAt"
    FROM novel_sources ns
    JOIN novels n ON n.id = ns.novel_id
    WHERE ns.consecutive_failures > 0
    ORDER BY ns.consecutive_failures DESC
    LIMIT 50
  `;
}
