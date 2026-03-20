import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as sourcesService from './sources.service.js';

const patchSourceSchema = z.object({
  monitoringEnabled: z.boolean(),
});

export async function sourcesRoutes(fastify: FastifyInstance) {
  fastify.patch<{ Params: { sourceId: string } }>(
    '/sources/:sourceId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = patchSourceSchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ message: 'Validation error', errors: body.error.format() });
      }

      const source = await sourcesService.toggleMonitoring(
        request.params.sourceId,
        body.data.monitoringEnabled,
      );
      if (!source) {
        return reply.code(404).send({ message: 'Source not found' });
      }
      return reply.send(source);
    },
  );
}
