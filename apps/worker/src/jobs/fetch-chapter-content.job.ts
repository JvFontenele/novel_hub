import type { Job } from 'bullmq';
import { fetchChapterContent } from '@novel-hub/scraping';
import type { FetchChapterContentJobData } from '@novel-hub/shared';
import { sql } from '../db/client.js';

interface ChapterRow {
  chapterId: string;
  chapterNumber: string | number;
  title: string | null;
  url: string;
  content: string | null;
}

export async function fetchChapterContentJob(job: Job<FetchChapterContentJobData>) {
  const { novelId, chapterId } = job.data;

  const rows = await sql<ChapterRow[]>`
    SELECT
      id AS "chapterId",
      chapter_number AS "chapterNumber",
      title,
      url,
      content
    FROM chapters
    WHERE id = ${chapterId} AND novel_id = ${novelId}
  `;

  const chapter = rows[0] ?? null;
  if (!chapter) {
    throw new Error(`Chapter ${chapterId} not found for novel ${novelId}`);
  }

  if (chapter.content) {
    console.info(`[fetch-chapter-content] chapterId=${chapterId} skipped=already-fetched`);
    return chapter;
  }

  const content = await fetchChapterContent(chapter.url);

  const savedRows = await sql`
    UPDATE chapters
    SET content = ${content}, content_fetched_at = NOW()
    WHERE id = ${chapterId}
    RETURNING
      id AS "chapterId",
      content_fetched_at AS "contentFetchedAt"
  `;

  if (savedRows.length === 0) {
    throw new Error(`Failed to save content for chapter ${chapterId}`);
  }

  console.info(`[fetch-chapter-content] chapterId=${chapterId} chapterNumber=${chapter.chapterNumber} fetched`);

  return savedRows[0];
}
