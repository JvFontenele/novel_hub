import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { authPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { novelsRoutes } from './modules/novels/novels.routes.js';
import { sourcesRoutes } from './modules/sources/sources.routes.js';
import { chaptersRoutes } from './modules/chapters/chapters.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { assetsRoutes } from './modules/assets/assets.routes.js';
import { config } from './config.js';
import { registerSwagger } from './openapi/swagger.js';
import { healthResponseSchema } from './openapi/schemas.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  await fastify.register(sensible);
  await fastify.register(authPlugin);
  await registerSwagger(fastify);

  const apiPrefix = { prefix: '/api/v1' };
  await fastify.register(authRoutes, apiPrefix);
  await fastify.register(novelsRoutes, apiPrefix);
  await fastify.register(sourcesRoutes, apiPrefix);
  await fastify.register(chaptersRoutes, apiPrefix);
  await fastify.register(notificationsRoutes, apiPrefix);
  await fastify.register(adminRoutes, apiPrefix);
  await fastify.register(assetsRoutes, apiPrefix);

  fastify.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns the API liveness status.',
      response: {
        200: healthResponseSchema,
      },
    },
  }, async () => ({ status: 'ok' }));

  return fastify;
}
