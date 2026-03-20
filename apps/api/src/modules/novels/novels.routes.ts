import type { FastifyInstance } from 'fastify';
import { createNovelSchema, updateProgressSchema } from './novels.schema.js';
import * as novelsService from './novels.service.js';
import * as novelsRepo from './novels.repository.js';

export async function novelsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/novels',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = createNovelSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ message: 'Validation error', errors: body.error.format() });
      }

      const { sourceUrl, displayName } = body.data;
      const result = await novelsService.registerNovel(request.user.sub, sourceUrl, displayName);
      return reply.code(201).send(result);
    },
  );

  fastify.get(
    '/novels',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const items = await novelsRepo.listNovelsByUser(request.user.sub);
      return reply.send({ items });
    },
  );

  fastify.get<{ Params: { novelId: string } }>(
    '/novels/:novelId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const novel = await novelsRepo.findNovelById(request.params.novelId, request.user.sub);
      if (!novel) {
        return reply.code(404).send({ message: 'Novel not found' });
      }
      return reply.send(novel);
    },
  );

  fastify.patch<{ Params: { novelId: string } }>(
    '/novels/:novelId/progress',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = updateProgressSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ message: 'Validation error', errors: body.error.format() });
      }

      const result = await novelsRepo.updateProgress(
        request.user.sub,
        request.params.novelId,
        body.data.lastReadChapterNumber,
      );
      if (!result) {
        return reply.code(404).send({ message: 'Subscription not found' });
      }
      return reply.send(result);
    },
  );
}
