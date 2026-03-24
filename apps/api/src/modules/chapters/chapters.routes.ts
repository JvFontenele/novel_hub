import type { FastifyInstance } from 'fastify';
import { fetchChapterContent } from '@novel-hub/scraping';
import {
  findChapterById,
  getChapterContent,
  listChaptersByNovel,
  saveChapterContent,
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
} from '../../openapi/schemas.js';

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
          200: chapterContentSchema,
          404: errorResponseSchema,
          502: errorResponseSchema,
          504: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { novelId, chapterId } = request.params;

      const chapter = await findChapterById(chapterId, novelId);
      if (!chapter) {
        return reply.status(404).send({ message: 'Capítulo não encontrado.' });
      }

      let content: string;
      try {
        const timeoutSignal = AbortSignal.timeout(50_000);
        content = await Promise.race([
          fetchChapterContent(chapter.url),
          new Promise<never>((_, reject) => {
            timeoutSignal.addEventListener('abort', () =>
              reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })),
            );
          }),
        ]);
      } catch (err: unknown) {
        const isTimeout =
          err instanceof Error && (err.name === 'TimeoutError' || err.message === 'timeout');
        if (isTimeout) {
          return reply.status(504).send({ message: 'Tempo limite excedido ao buscar o capítulo.' });
        }
        const message = err instanceof Error ? err.message : 'Erro ao buscar conteúdo do capítulo.';
        return reply.status(502).send({ message });
      }

      const saved = await saveChapterContent(chapterId, content);
      if (!saved) {
        return reply.status(502).send({ message: 'Erro ao salvar conteúdo do capítulo.' });
      }

      return reply.send({
        chapterId: chapter.chapterId,
        chapterNumber: Number(chapter.chapterNumber),
        title: chapter.title ?? null,
        content: saved.content,
        contentFetchedAt: saved.contentFetchedAt,
        url: chapter.url,
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
