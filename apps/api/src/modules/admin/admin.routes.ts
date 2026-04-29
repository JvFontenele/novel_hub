import type { FastifyInstance } from 'fastify';
import * as adminRepo from './admin.repository.js';
import { z } from 'zod';
import {
  bearerSecurity,
  collectorRunSchema,
  errorResponseSchema,
  listResponseSchema,
  sourceFailureSchema,
} from '../../openapi/schemas.js';

const scraperSettingBodySchema = z.object({
  hostname: z.string().min(1),
  cookies: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

const scraperSettingSchema = {
  type: 'object',
  properties: {
    hostname: { type: 'string' },
    hasCookies: { type: 'boolean' },
    cookies: { type: 'string', nullable: true },
    cookiesPreview: { type: 'string', nullable: true },
    userAgent: { type: 'string', nullable: true },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['hostname', 'hasCookies', 'cookies', 'cookiesPreview', 'userAgent', 'updatedAt'],
} as const;

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

  fastify.get(
    '/admin/scraper-settings',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Admin'],
        summary: 'List scraper settings',
        description: 'Lists dynamic cookies/user-agent settings used by scraper workers. Requires admin.',
        security: bearerSecurity,
        response: {
          200: listResponseSchema(scraperSettingSchema),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const items = await adminRepo.listScraperSettings();
      return reply.send({ items });
    },
  );

  fastify.put(
    '/admin/scraper-settings',
    {
      preHandler: [fastify.authorizeAdmin],
      schema: {
        tags: ['Admin'],
        summary: 'Update scraper settings',
        description: 'Stores cookies/user-agent for a scraper hostname without rebuilding services.',
        security: bearerSecurity,
        response: {
          200: scraperSettingSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = scraperSettingBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ message: 'Invalid scraper settings' });
      }

      const setting = await adminRepo.upsertScraperSetting({
        hostname: body.data.hostname,
        cookies: body.data.cookies ?? null,
        userAgent: body.data.userAgent ?? null,
        updatedBy: request.user.sub,
      });
      return reply.send(setting);
    },
  );
}
