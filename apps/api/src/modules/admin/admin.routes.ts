import type { FastifyInstance } from 'fastify';
import * as adminRepo from './admin.repository.js';
import {
  bearerSecurity,
  collectorRunSchema,
  errorResponseSchema,
  listResponseSchema,
  sourceFailureSchema,
} from '../../openapi/schemas.js';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/admin/collector-runs',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Admin'],
        summary: 'List collector runs',
        description: 'Returns recent collector executions. Requires an authenticated admin user.',
        security: bearerSecurity,
        response: {
          200: listResponseSchema(collectorRunSchema),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const items = await adminRepo.listCollectorRuns();
      return reply.send({ items });
    },
  );

  fastify.get(
    '/admin/source-failures',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Admin'],
        summary: 'List failing sources',
        description: 'Returns sources with consecutive failures. Requires an authenticated admin user.',
        security: bearerSecurity,
        response: {
          200: listResponseSchema(sourceFailureSchema),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const items = await adminRepo.listSourceFailures();
      return reply.send({ items });
    },
  );
}
