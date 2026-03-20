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

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  fastify.register(sensible);
  fastify.register(authPlugin);

  const apiPrefix = { prefix: '/api/v1' };
  fastify.register(authRoutes, apiPrefix);
  fastify.register(novelsRoutes, apiPrefix);
  fastify.register(sourcesRoutes, apiPrefix);
  fastify.register(chaptersRoutes, apiPrefix);
  fastify.register(notificationsRoutes, apiPrefix);
  fastify.register(adminRoutes, apiPrefix);
  fastify.register(assetsRoutes, apiPrefix);

  fastify.get('/health', async () => ({ status: 'ok' }));

  return fastify;
}
