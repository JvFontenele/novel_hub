import type { FastifyInstance } from 'fastify';
import {
  findChapterById,
  getChapterContent,
  listChaptersByNovel,
} from './chapters.repository.js';
import {
  bearerSecurity,
  chapterContentSchema,
  chapterListItemSchema,
  chapterListQuerySchema,
  chapterParamsSchema,
  errorResponseSchema,
  idParamsSchema,
  listResponseSchema,
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
      const items = await listChaptersByNovel(request.params.novelId, page, pageSize);
      return reply.send({ items });
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
