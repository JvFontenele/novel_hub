import type { FastifyInstance } from 'fastify';
import { listChaptersByNovel } from './chapters.repository.js';
import {
  bearerSecurity,
  chapterListItemSchema,
  chapterListQuerySchema,
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
}
