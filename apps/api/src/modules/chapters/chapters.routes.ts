import type { FastifyInstance } from 'fastify';
import {
  clearChapterContent,
  findChapterById,
  getChapterContent,
  listChapterIdsByNovel,
  listChaptersByNovel,
} from './chapters.repository.js';
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
import { enqueueFetchChapterContent } from '../../queue/producer.js';

export async function chaptersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { novelId: string }; Querystring: { page?: number; pageSize?: number } }>(
    '/novels/:novelId/chapters',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'List chapters by novel',
        description: 'Returns paginated chapter entries for a tracked novel.',
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
      const { page = 1, pageSize = 50 } = request.query;
      const { items, total } = await listChaptersByNovel(request.params.novelId, page, pageSize);
      return reply.send({ items, total, page, pageSize });
    },
  );

  fastify.post<{ Params: { novelId: string } }>(
    '/novels/:novelId/chapters/content',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Queue scraping for all chapters',
        description: 'Queues chapter content scraping jobs for every chapter in the novel.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        response: {
          202: queueAllChapterContentResponseSchema,
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

      await Promise.all(
        chapters.map((chapter) =>
          enqueueFetchChapterContent(novelId, chapter.chapterId, {
            jobId: `chapter-content-${chapter.chapterId}`,
          }),
        ),
      );

      return reply.status(202).send({
        queued: true,
        totalChapters: chapters.length,
      });
    },
  );

  fastify.post<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Fetch and cache chapter content',
        description: 'Scrapes chapter content from the source URL and saves it in the database.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          202: queueChapterContentResponseSchema,
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

      await enqueueFetchChapterContent(novelId, chapterId);

      return reply.status(202).send({
        queued: true,
        chapterId: chapter.chapterId,
      });
    },
  );

  fastify.post<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content/reprocess',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Reprocess chapter content',
        description: 'Clears cached chapter content and queues a fresh scraping job.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          202: queueChapterContentResponseSchema,
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
      await enqueueFetchChapterContent(novelId, chapterId);

      return reply.status(202).send({
        queued: true,
        chapterId: chapter.chapterId,
      });
    },
  );

  fastify.delete<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Delete cached chapter content',
        description: 'Removes the cached content for a chapter without deleting the chapter entry.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          200: deleteChapterContentResponseSchema,
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

  fastify.get<{ Params: { novelId: string; chapterId: string } }>(
    '/novels/:novelId/chapters/:chapterId/content',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Chapters'],
        summary: 'Get cached chapter content',
        description: 'Returns previously fetched chapter content stored in the database.',
        security: bearerSecurity,
        params: chapterParamsSchema,
        response: {
          200: chapterContentSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;

      const row = await getChapterContent(chapterId, novelId);
      if (!row || !row.content) {
        return reply.status(404).send({ message: 'Conteúdo ainda não foi buscado para este capítulo.' });
      }

      return reply.send({
        chapterId: row.chapterId,
        chapterNumber: Number(row.chapterNumber),
        title: row.title ?? null,
        content: row.content,
        contentFetchedAt: row.contentFetchedAt,
        url: row.url,
      });
    },
  );
}
