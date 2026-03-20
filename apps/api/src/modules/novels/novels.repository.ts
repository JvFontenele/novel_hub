import { sql } from '../../db/client.js';

export async function createNovel(title: string) {
  const [novel] = await sql`
    INSERT INTO novels (title)
    VALUES (${title})
    RETURNING *
  `;
  return novel;
}

export async function createSource(novelId: string, url: string, connectorKey: string) {
  const [source] = await sql`
    INSERT INTO novel_sources (novel_id, url, connector_key, next_check_at)
    VALUES (${novelId}, ${url}, ${connectorKey}, NOW())
    RETURNING *
  `;
  return source;
}

export async function findNovelById(novelId: string, userId: string) {
  const [row] = await sql`
    SELECT
      n.*,
      s.last_read_chapter_number,
      json_agg(json_build_object(
        'id', ns.id,
        'url', ns.url,
        'status', ns.status,
        'monitoringEnabled', ns.monitoring_enabled,
        'lastCheckedAt', ns.last_checked_at
      )) AS sources
    FROM novels n
    JOIN subscriptions s ON s.novel_id = n.id AND s.user_id = ${userId}
    LEFT JOIN novel_sources ns ON ns.novel_id = n.id
    WHERE n.id = ${novelId}
    GROUP BY n.id, s.last_read_chapter_number
  `;
  return row ?? null;
}

export async function listNovelsByUser(userId: string) {
  return sql`
    SELECT
      n.id AS "novelId",
      n.title,
      n.cover_url AS "coverUrl",
      n.status,
      n.last_chapter_number AS "lastChapterNumber",
      s.last_read_chapter_number AS "lastReadChapterNumber"
    FROM novels n
    JOIN subscriptions s ON s.novel_id = n.id AND s.user_id = ${userId}
    ORDER BY n.updated_at DESC
  `;
}

export async function createSubscription(userId: string, novelId: string) {
  const [sub] = await sql`
    INSERT INTO subscriptions (user_id, novel_id)
    VALUES (${userId}, ${novelId})
    ON CONFLICT (user_id, novel_id) DO NOTHING
    RETURNING *
  `;
  return sub;
}

export async function updateProgress(userId: string, novelId: string, lastReadChapterNumber: number) {
  const [sub] = await sql`
    UPDATE subscriptions
    SET last_read_chapter_number = ${lastReadChapterNumber}, updated_at = NOW()
    WHERE user_id = ${userId} AND novel_id = ${novelId}
    RETURNING novel_id AS "novelId", last_read_chapter_number AS "lastReadChapterNumber"
  `;
  return sub ?? null;
}
