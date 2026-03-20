import { sql } from '../../db/client.js';

export async function listChaptersByNovel(novelId: string, page = 1, pageSize = 50) {
  const offset = (page - 1) * pageSize;
  return sql`
    SELECT
      id AS "chapterId",
      chapter_number AS "chapterNumber",
      title,
      url,
      published_at AS "publishedAt",
      created_at AS "createdAt"
    FROM chapters
    WHERE novel_id = ${novelId}
    ORDER BY chapter_number DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;
}
