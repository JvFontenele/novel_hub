import type { FastifyInstance } from 'fastify';
import * as adminRepo from './admin.repository.js';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/admin/collector-runs',
    { preHandler: [fastify.authorizeAdmin] },
    async (_request, reply) => {
      const items = await adminRepo.listCollectorRuns();
      return reply.send({ items });
    },
  );

  fastify.get(
    '/admin/source-failures',
    { preHandler: [fastify.authorizeAdmin] },
    async (_request, reply) => {
      const items = await adminRepo.listSourceFailures();
      return reply.send({ items });
    },
  );
}
