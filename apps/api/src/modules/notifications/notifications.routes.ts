import type { FastifyInstance } from 'fastify';
import * as notificationsRepo from './notifications.repository.js';
import {
  bearerSecurity,
  errorResponseSchema,
  idParamsSchema,
  listResponseSchema,
  markNotificationReadResponseSchema,
  notificationSchema,
} from '../../openapi/schemas.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/notifications',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Notifications'],
        summary: 'List notifications',
        description: 'Returns the latest notifications for the authenticated user.',
        security: bearerSecurity,
        response: {
          200: listResponseSchema(notificationSchema),
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const items = await notificationsRepo.listNotifications(request.user.sub);
      return reply.send({ items });
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        description: 'Marks a single notification as read for the authenticated user.',
        security: bearerSecurity,
        params: idParamsSchema('id', 'Notification identifier'),
        response: {
          200: markNotificationReadResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await notificationsRepo.markNotificationRead(request.params.id, request.user.sub);
      if (!result) {
        return reply.code(404).send({ message: 'Notification not found' });
      }
      return reply.send({ id: result.id });
    },
  );
}
