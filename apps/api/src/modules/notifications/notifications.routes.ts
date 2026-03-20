import type { FastifyInstance } from 'fastify';
import * as notificationsRepo from './notifications.repository.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/notifications',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const items = await notificationsRepo.listNotifications(request.user.sub);
      return reply.send({ items });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await notificationsRepo.markNotificationRead(request.params.id, request.user.sub);
      if (!result) {
        return reply.code(404).send({ message: 'Notification not found' });
      }
      return reply.send({ id: result.id });
    },
  );
}
