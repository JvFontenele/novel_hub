import type { FastifyInstance } from 'fastify';
import { createNovelSchema, updateProgressSchema } from './novels.schema.js';
import * as novelsService from './novels.service.js';
import * as novelsRepo from './novels.repository.js';
import {
  bearerSecurity,
  createNovelResponseSchema,
  errorResponseSchema,
  fromZod,
  idParamsSchema,
  listResponseSchema,
  novelDetailSchema,
  novelEventSchema,
  novelListItemSchema,
  updateProgressResponseSchema,
} from '../../openapi/schemas.js';

export async function novelsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/novels',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'Create a novel subscription',
        description: 'Registers a novel source for the authenticated user and queues collection.',
        security: bearerSecurity,
        body: fromZod(createNovelSchema),
        response: {
          201: createNovelResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
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
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'List subscribed novels',
        description: 'Returns the novels tracked by the authenticated user.',
        security: bearerSecurity,
        response: {
          200: listResponseSchema(novelListItemSchema),
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const items = await novelsRepo.listNovelsByUser(request.user.sub);
      return reply.send({ items });
    },
  );

  fastify.get<{ Params: { novelId: string } }>(
    '/novels/:novelId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'Get novel details',
        description: 'Returns the detailed view for a tracked novel, including sources.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        response: {
          200: novelDetailSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
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
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'Update reading progress',
        description: 'Stores the last chapter number read by the authenticated user.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        body: fromZod(updateProgressSchema),
        response: {
          200: updateProgressResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
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

  fastify.delete<{ Params: { novelId: string } }>(
    '/novels/:novelId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'Remove a tracked novel',
        description: 'Removes the novel from the authenticated user library and deletes the novel record when no subscribers remain.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        response: {
          200: {
            type: 'object',
            required: ['removed', 'novelId'],
            properties: {
              removed: { type: 'boolean', const: true },
              novelId: { type: 'string', format: 'uuid' },
            },
          },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await novelsRepo.removeNovelForUser(request.user.sub, request.params.novelId);
      if (!result) {
        return reply.code(404).send({ message: 'Subscription not found' });
      }
      return reply.send(result);
    },
  );

  fastify.get<{ Params: { novelId: string } }>(
    '/novels/:novelId/events',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Novels'],
        summary: 'List novel events',
        description: 'Returns recent change events for a tracked novel.',
        security: bearerSecurity,
        params: idParamsSchema('novelId', 'Novel identifier'),
        response: {
          200: listResponseSchema(novelEventSchema),
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const items = await novelsRepo.listEventsByNovel(request.params.novelId, request.user.sub);
      return reply.send({ items });
    },
  );
}
