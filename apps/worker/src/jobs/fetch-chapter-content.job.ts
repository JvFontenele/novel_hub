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
  const { novelId, chapterId, requestedByUserId } = job.data;

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

  try {
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
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const totalAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= totalAttempts;

    if (isFinalAttempt && requestedByUserId) {
      const chapterLabel = chapter.title
        ? `Capítulo ${chapter.chapterNumber} - ${chapter.title}`
        : `Capítulo ${chapter.chapterNumber}`;

      await sql`
        INSERT INTO notifications (user_id, novel_id, type, title, body)
        VALUES (
          ${requestedByUserId},
          ${novelId},
          'SOURCE_FAILED',
          'Erro ao buscar conteúdo do capítulo',
          ${`${chapterLabel}: ${errorMessage}`}
        )
      `;
    }

    throw err;
  }
}
