import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import type { JwtPayload } from '@novel-hub/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  fastify.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.decorate('authorizeAdmin', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'admin') {
        reply.code(403).send({ message: 'Forbidden' });
      }
    } catch (err) {
      reply.send(err);
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    authorizeAdmin: (request: any, reply: any) => Promise<void>;
  }
}
