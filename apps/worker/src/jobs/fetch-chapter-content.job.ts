import type { Job } from 'bullmq';
import { fetchChapterContent } from '@novel-hub/scraping';
import type { FetchChapterContentJobData } from '@novel-hub/shared';
import { sql } from '../db/client.js';
import { isFinalAttempt, insertNotification } from './notify.js';

interface ChapterRow {
  chapterId: string;
  chapterNumber: string | number;
  title: string | null;
  url: string;
  content: string | null;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (/novelbin\.com/i.test(chapter.url)) {
      const attemptOffset = Math.max(0, job.attemptsMade);
      await wait(1_250 + attemptOffset * 1_000);
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
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (isFinalAttempt(job)) {
      const chapterLabel = chapter.title
        ? `Capítulo ${chapter.chapterNumber} - ${chapter.title}`
        : `Capítulo ${chapter.chapterNumber}`;

      const [event] = await sql`
        INSERT INTO events (novel_id, type, payload)
        VALUES (
          ${novelId},
          'SOURCE_FAILED',
          ${sql.json({
            chapterId,
            chapterNumber: chapter.chapterNumber,
            chapterTitle: chapter.title,
            chapterUrl: chapter.url,
            errorMessage,
            phase: 'FETCH_CHAPTER_CONTENT',
          })}
        )
        RETURNING id
      `;

      await insertNotification({
        requestedByUserId,
        novelId,
        eventId: event.id,
        type: 'SOURCE_FAILED',
        title: 'Erro ao buscar conteúdo do capítulo',
        body: `${chapterLabel}: ${errorMessage}`,
      });
    }

    throw err;
  }
}
