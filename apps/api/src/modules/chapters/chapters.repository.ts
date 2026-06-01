import { sql } from '../../db/client.js';

export type ChapterSortOrder = 'asc' | 'desc';

export async function listChaptersByNovel(
  novelId: string,
  page = 1,
  pageSize = 50,
  order: ChapterSortOrder = 'desc',
) {
  const offset = (page - 1) * pageSize;
  const sortDirection = order === 'asc' ? sql`ASC` : sql`DESC`;
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
    ORDER BY chapter_number ${sortDirection}
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
      c.id AS "chapterId",
      c.chapter_number AS "chapterNumber",
      c.title,
      c.url,
      c.content,
      c.content_fetched_at AS "contentFetchedAt",
      prev.id AS "prevChapterId",
      next.id AS "nextChapterId"
    FROM chapters c
    LEFT JOIN LATERAL (
      SELECT id FROM chapters
      WHERE novel_id = ${novelId} AND chapter_number < c.chapter_number
      ORDER BY chapter_number DESC LIMIT 1
    ) prev ON true
    LEFT JOIN LATERAL (
      SELECT id FROM chapters
      WHERE novel_id = ${novelId} AND chapter_number > c.chapter_number
      ORDER BY chapter_number ASC LIMIT 1
    ) next ON true
    WHERE c.id = ${chapterId} AND c.novel_id = ${novelId}
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

export async function clearChapterContent(chapterId: string, novelId: string) {
  const rows = await sql`
    UPDATE chapters
    SET content = NULL, content_fetched_at = NULL
    WHERE id = ${chapterId} AND novel_id = ${novelId}
    RETURNING id AS "chapterId"
  `;

  return rows[0] ?? null;
}

export async function listChapterIdsByNovel(novelId: string) {
  return sql<{ chapterId: string; hasContent: boolean }[]>`
    SELECT
      id AS "chapterId",
      (content IS NOT NULL) AS "hasContent"
    FROM chapters
    WHERE novel_id = ${novelId}
    ORDER BY chapter_number ASC
  `;
}
