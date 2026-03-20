import type { FastifyInstance } from 'fastify';
import { listChaptersByNovel } from './chapters.repository.js';

export async function chaptersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { novelId: string }; Querystring: { page?: number; pageSize?: number } }>(
    '/novels/:novelId/chapters',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { page = 1, pageSize = 50 } = request.query;
      const items = await listChaptersByNovel(request.params.novelId, page, pageSize);
      return reply.send({ items });
    },
  );
}
