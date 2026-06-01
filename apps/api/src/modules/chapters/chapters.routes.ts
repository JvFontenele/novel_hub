import type { FastifyInstance } from 'fastify';
import pLimit from 'p-limit';
import {
  clearChapterContent,
  findChapterById,
  getChapterContent,
  getTranslation,
  listAvailableLanguages,
  listChapterIdsByNovel,
  listChaptersByNovel,
  upsertTranslation,
} from './chapters.repository.js';
import { ensureSubscription } from '../novels/novels.repository.js';
import {
  bearerSecurity,
  chapterContentSchema,
  chapterListItemSchema,
  chapterListQuerySchema,
  chapterParamsSchema,
  deleteChapterContentResponseSchema,
  errorResponseSchema,
  idParamsSchema,
  listResponseSchema,
  queueAllChapterContentResponseSchema,
  queueChapterContentResponseSchema,
} from '../../openapi/schemas.js';
import {
  enqueueFetchChapterContent,
  getChapterContentJobId,
  getManualChapterContentJobId,
  hasPendingChapterContentJob,
} from '../../queue/producer.js';

export async function chaptersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { novelId: string }; Querystring: { page?: number; pageSize?: number; order?: 'asc' | 'desc' } }>(
    '/novels/:novelId/chapters',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'List chapters by novel',
        description: 'Returns paginated chapter entries for a novel.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        querystring: chapterListQuerySchema,
        response: {
          200: listResponseSchema(chapterListItemSchema),
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page = 1, pageSize = 50, order = 'desc' } = request.query;
      const { items, total } = await listChaptersByNovel(request.params.novelId, page, pageSize, order);
      return reply.send({ items, total, page, pageSize });
    },
  );

  fastify.post<{ Params: { novelId: string } }>(
    '/novels/:novelId/chapters/content',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Chapters'],
        summary: 'Queue scraping for all chapters',
        description: 'Admin-only: queues chapter content scraping jobs for every chapter in the novel.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        response: {
          202: queueAllChapterContentResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId } = request.params;
      const chapters = await listChapterIdsByNovel(novelId);

      if (chapters.length === 0) {
        return reply.status(404).send({ message: 'Nenhum capítulo encontrado para esta novel.' });
      }

      const checkLimit = pLimit(20);
      const enqueueLimit = pLimit(20);

      const chaptersToQueue = (
        await Promise.all(
          chapters.map((chapter) =>
            checkLimit(async () => {
              if (chapter.hasContent) return null;
              const hasPendingJob = await hasPendingChapterContentJob(chapter.chapterId);
              return hasPendingJob ? null : chapter;
            }),
          ),
        )
      ).filter((chapter): chapter is (typeof chapters)[number] => chapter !== null);

      await Promise.all(
        chaptersToQueue.map((chapter) =>
          enqueueLimit(() =>
            enqueueFetchChapterContent(novelId, chapter.chapterId, {
              jobId: getChapterContentJobId(chapter.chapterId),
              requestedByUserId: request.user.sub,
            }),
          ),
        ),
      );

      return reply.status(202).send({
        queued: true,
        totalChapters: chaptersToQueue.length,
      });
    },
  );

  fastify.post<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Chapters'],
        summary: 'Fetch and cache chapter content',
        description: 'Admin-only: scrapes chapter content from the source URL and saves it in the database.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          202: queueChapterContentResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;

      const chapter = await findChapterById(chapterId, novelId);
      if (!chapter) {
        return reply.status(404).send({ message: 'Capítulo não encontrado.' });
      }

      await enqueueFetchChapterContent(novelId, chapterId, {
        jobId: getManualChapterContentJobId(chapterId),
        requestedByUserId: request.user.sub,
      });

      return reply.status(202).send({
        queued: true,
        chapterId: chapter.chapterId,
      });
    },
  );

  fastify.post<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content/reprocess',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Chapters'],
        summary: 'Reprocess chapter content',
        description: 'Admin-only: clears cached chapter content and queues a fresh scraping job.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          202: queueChapterContentResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;
      const chapter = await findChapterById(chapterId, novelId);

      if (!chapter) {
        return reply.status(404).send({ message: 'Capítulo não encontrado.' });
      }

      await clearChapterContent(chapterId, novelId);
      await enqueueFetchChapterContent(novelId, chapterId, {
        jobId: getManualChapterContentJobId(chapterId),
        requestedByUserId: request.user.sub,
      });

      return reply.status(202).send({
        queued: true,
        chapterId: chapter.chapterId,
      });
    },
  );

  fastify.delete<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Chapters'],
        summary: 'Delete cached chapter content',
        description: 'Admin-only: removes the cached content for a chapter without deleting the chapter entry.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          200: deleteChapterContentResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;
      const cleared = await clearChapterContent(chapterId, novelId);

      if (!cleared) {
        return reply.status(404).send({ message: 'Capítulo não encontrado.' });
      }

      return reply.send({
        removed: true,
        chapterId: cleared.chapterId,
      });
    },
  );

  fastify.get<{ Params: { novelId: string; chapterId: string }; Querystring: { language?: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Get cached chapter content',
        description: 'Returns chapter content. Pass ?language=pt-br to get a translation if available.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        querystring: {
          type: 'object',
          properties: { language: { type: 'string' } },
          additionalProperties: false,
        },
        response: {
          200: chapterContentSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;
      const { language } = request.query;

      const row = await getChapterContent(chapterId, novelId);
      if (!row || !row.content) {
        return reply.status(404).send({ message: 'Conteúdo ainda não foi buscado para este capítulo.' });
      }

      await ensureSubscription(request.user.sub, novelId);

      let content = row.content;
      let translationLanguage: string | null = null;
      if (language) {
        const translation = await getTranslation(chapterId, language);
        if (translation) {
          content = translation.content;
          translationLanguage = translation.language;
        }
      }

      return reply.send({
        chapterId: row.chapterId,
        chapterNumber: Number(row.chapterNumber),
        title: row.title ?? null,
        content,
        contentFetchedAt: row.contentFetchedAt,
        url: row.url,
        prevChapterId: row.prevChapterId ?? null,
        nextChapterId: row.nextChapterId ?? null,
        language: translationLanguage,
      });
    },
  );

  fastify.get<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/languages',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'List available translation languages for a chapter',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: { languages: { type: 'array', items: { type: 'string' } } },
          },
        },
      },
    },
    async (request, reply) => {
      const { chapterId } = request.params;
      const langs = await listAvailableLanguages(chapterId);
      return reply.send({ languages: langs.map((l) => l.language) });
    },
  );

  fastify.put<{ Params: { novelId: string; chapterId: string }; Body: { language: string; content: string } }>(
    '/novels/:novelId/chapters/:chapterId/translation',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Chapters'],
        summary: 'Save chapter translation',
        security: bearerSecurity,
        params: chapterParamsSchema,
        body: {
          type: 'object',
          properties: {
            language: { type: 'string', minLength: 2, maxLength: 10 },
            content: { type: 'string', minLength: 1 },
          },
          required: ['language', 'content'],
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              availableLanguages: { type: 'array', items: { type: 'string' } },
            },
          },
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;
      const { language, content } = request.body;

      const chapter = await findChapterById(chapterId, novelId);
      if (!chapter) return reply.status(404).send({ message: 'Capítulo não encontrado.' });

      await upsertTranslation(chapterId, language, content);
      const langs = await listAvailableLanguages(chapterId);

      return reply.send({ language, availableLanguages: langs.map((l) => l.language) });
    },
  );
}
