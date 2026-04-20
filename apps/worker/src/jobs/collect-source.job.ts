import { createHash } from 'node:crypto';
import type { Job } from 'bullmq';
import type { CollectSourceJobData } from '@novel-hub/shared';
import { resolveConnector } from '@novel-hub/scraping';
import { sql } from '../db/client.js';

export async function collectSourceJob(job: Job<CollectSourceJobData>) {
  const { sourceId, requestedByUserId } = job.data;
  const startedAt = new Date();

  const [source] = await sql`SELECT * FROM novel_sources WHERE id = ${sourceId}`;
  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  const connector = resolveConnector(source.url);
  let chaptersFound = 0;
  let chaptersNew = 0;

  try {
    const [{ existingChapters }] = await sql<{ existingChapters: number }[]>`
      SELECT COUNT(*)::int AS "existingChapters"
      FROM chapters
      WHERE source_id = ${sourceId}
    `;

    const shouldNotifyNewChapters = existingChapters > 0;
    const parsed = await connector.fetchNovelData(source.url);

    chaptersFound = parsed.chapters.length;

    // Update novel metadata if we got useful data
    if (parsed.title) {
      await sql`
        UPDATE novels
        SET
          title = COALESCE(NULLIF(${parsed.title}, ''), title),
          cover_url = COALESCE(${parsed.coverUrl}, cover_url),
          synopsis = COALESCE(${parsed.synopsis}, synopsis),
          author = COALESCE(${parsed.author}, author),
          status = ${parsed.status}::novel_status,
          updated_at = NOW()
        WHERE id = ${source.novel_id}
      `;
    }

    // Insert chapters with idempotency
    for (const chapter of parsed.chapters) {
      const contentHash = createHash('sha256')
        .update(`${sourceId}:${chapter.chapterNumber}:${chapter.url}`)
        .digest('hex');

      const result = await sql`
        INSERT INTO chapters (source_id, novel_id, chapter_number, title, url, content_hash, published_at)
        VALUES (
          ${sourceId},
          ${source.novel_id},
          ${chapter.chapterNumber},
          ${chapter.title},
          ${chapter.url},
          ${contentHash},
          ${chapter.publishedAt}
        )
        ON CONFLICT (source_id, content_hash) DO NOTHING
        RETURNING id
      `;

      if (result.length > 0) {
        chaptersNew++;

        if (shouldNotifyNewChapters) {
          const [event] = await sql`
            INSERT INTO events (novel_id, source_id, type, payload)
            VALUES (
              ${source.novel_id},
              ${sourceId},
              'NEW_CHAPTER',
              ${sql.json({
                chapterId: result[0].id,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                chapterUrl: chapter.url,
              })}
            )
            RETURNING id
          `;

          await sql`
            INSERT INTO notifications (user_id, novel_id, event_id, type, title, body)
            SELECT
              s.user_id,
              ${source.novel_id},
              ${event.id},
              'NEW_CHAPTER',
              'Novo capítulo disponível',
              CONCAT('Capítulo ', ${chapter.chapterNumber}::text, COALESCE(' - ' || ${chapter.title}, ''))
            FROM subscriptions s
            WHERE s.novel_id = ${source.novel_id}
          `;
        }
      }
    }

    // Update novel's last_chapter_number
    if (chaptersNew > 0) {
      await sql`
        UPDATE novels n
        SET last_chapter_number = (
          SELECT MAX(chapter_number)
          FROM chapters
          WHERE novel_id = n.id
        ),
        updated_at = NOW()
        WHERE id = ${source.novel_id}
      `;
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    // Write collector run audit record
    await sql`
      INSERT INTO collector_runs (source_id, status, chapters_found, chapters_new, duration_ms, started_at, finished_at)
      VALUES (${sourceId}, 'SUCCESS', ${chaptersFound}, ${chaptersNew}, ${durationMs}, ${startedAt}, ${finishedAt})
    `;

    // Reset failure count and schedule next check
    const nextCheck = new Date(Date.now() + source.check_interval_min * 60 * 1000);
    await sql`
      UPDATE novel_sources
      SET
        last_checked_at = NOW(),
        next_check_at = ${nextCheck},
        consecutive_failures = 0,
        updated_at = NOW()
      WHERE id = ${sourceId}
    `;

    console.info(`[collect-source] sourceId=${sourceId} found=${chaptersFound} new=${chaptersNew} duration=${durationMs}ms`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    await sql`
      INSERT INTO collector_runs (source_id, status, chapters_found, chapters_new, error_message, duration_ms, started_at, finished_at)
      VALUES (${sourceId}, 'FAILED', ${chaptersFound}, 0, ${errorMessage}, ${durationMs}, ${startedAt}, ${finishedAt})
    `;

    const newFailures = source.consecutive_failures + 1;
    const newStatus = newFailures >= 5 ? 'FAILED' : source.status;

    await sql`
      UPDATE novel_sources
      SET
        last_checked_at = NOW(),
        consecutive_failures = ${newFailures},
        status = ${newStatus}::source_status,
        updated_at = NOW()
      WHERE id = ${sourceId}
    `;

    const totalAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= totalAttempts;

    if (isFinalAttempt) {
      const [event] = await sql`
        INSERT INTO events (novel_id, source_id, type, payload)
        VALUES (
          ${source.novel_id},
          ${sourceId},
          'SOURCE_FAILED',
          ${sql.json({
            sourceId,
            sourceUrl: source.url,
            errorMessage,
            consecutiveFailures: newFailures,
          })}
        )
        RETURNING id
      `;

      if (requestedByUserId) {
        await sql`
          INSERT INTO notifications (user_id, novel_id, event_id, type, title, body)
          VALUES (
            ${requestedByUserId},
            ${source.novel_id},
            ${event.id},
            'SOURCE_FAILED',
            'Erro ao buscar capítulos da novel',
            ${errorMessage}
          )
        `;
      } else {
        await sql`
          INSERT INTO notifications (user_id, novel_id, event_id, type, title, body)
          SELECT
            s.user_id,
            ${source.novel_id},
            ${event.id},
            'SOURCE_FAILED',
            'Erro ao buscar capítulos da novel',
            ${errorMessage}
          FROM subscriptions s
          WHERE s.novel_id = ${source.novel_id}
        `;
      }
    }

    throw err; // let BullMQ handle retries
  }
}
