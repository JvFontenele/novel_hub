import { sql } from '../../db/client.js';

export async function listChaptersByNovel(novelId: string, page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  const items = await sql`
    SELECT
      id AS "chapterId",
      chapter_number AS "chapterNumber",
      title,
      url,
      published_at AS "publishedAt",
      created_at AS "createdAt",
      (content IS NOT NULL) AS "hasContent"
    FROM chapters
    WHERE novel_id = ${novelId}
    ORDER BY chapter_number DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM chapters
    WHERE novel_id = ${novelId}
  `;

  return {
    items,
    total,
  };
}

export async function findChapterById(chapterId: string, novelId: string) {
  const rows = await sql`
    SELECT
      id AS "chapterId",
      chapter_number AS "chapterNumber",
      title,
      url,
      novel_id AS "novelId"
    FROM chapters
    WHERE id = ${chapterId} AND novel_id = ${novelId}
  `;
  return rows[0] ?? null;
}

export async function getChapterContent(chapterId: string, novelId: string) {
  const rows = await sql`
    SELECT
      id AS "chapterId",
      chapter_number AS "chapterNumber",
      title,
      url,
      content,
      content_fetched_at AS "contentFetchedAt"
    FROM chapters
    WHERE id = ${chapterId} AND novel_id = ${novelId}
  `;
  return rows[0] ?? null;
}

export async function saveChapterContent(chapterId: string, content: string) {
  const rows = await sql`
    UPDATE chapters
    SET content = ${content}, content_fetched_at = NOW()
    WHERE id = ${chapterId}
    RETURNING
      id AS "chapterId",
      content,
      content_fetched_at AS "contentFetchedAt"
  `;
  return rows[0] ?? null;
}
