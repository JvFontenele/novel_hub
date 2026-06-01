import type { FastifyInstance } from 'fastify';
import type { TriggerSourceCollectionResponse } from '@novel-hub/contracts';
import { z } from 'zod';
import * as sourcesService from './sources.service.js';
import {
  bearerSecurity,
  errorResponseSchema,
  fromZod,
  idParamsSchema,
  sourceSchema,
  triggerCollectionResponseSchema,
} from '../../openapi/schemas.js';

const patchSourceSchema = z.object({
  monitoringEnabled: z.boolean(),
});

export async function sourcesRoutes(fastify: FastifyInstance) {
  fastify.patch<{ Params: { sourceId: string } }>(
    '/sources/:sourceId',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Sources'],
        summary: 'Toggle source monitoring',
        description: 'Admin-only: pauses or resumes monitoring for a source.',
        security: bearerSecurity,
        params: idParamsSchema('sourceId', 'Source identifier'),
        body: fromZod(patchSourceSchema),
        response: {
          200: sourceSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { monitoringEnabled } = request.body as { monitoringEnabled: boolean };
      const source = await sourcesService.toggleMonitoring(
        request.params.sourceId,
        monitoringEnabled,
      );
      if (!source) {
        return reply.code(404).send({ message: 'Source not found' });
      }
      return reply.send(source);
    },
  );

  fastify.post<{ Params: { sourceId: string } }>(
    '/sources/:sourceId/collect',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Sources'],
        summary: 'Trigger source collection',
        description: 'Admin-only: queues an immediate collection job for a source.',
        security: bearerSecurity,
        params: idParamsSchema('sourceId', 'Source identifier'),
        response: {
          202: triggerCollectionResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await sourcesService.triggerCollection(
        request.params.sourceId,
        request.user.sub,
      );
      if (!result) {
        return reply.code(404).send({ message: 'Source not found' });
      }

      return reply.code(202).send(result satisfies TriggerSourceCollectionResponse);
    },
  );
}
