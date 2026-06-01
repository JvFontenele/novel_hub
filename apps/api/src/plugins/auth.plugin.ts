import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import type { JwtPayload } from '@novel-hub/shared';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    await request.jwtVerify();
  });

  fastify.decorate('authorizeAdmin', async function (request: FastifyRequest, reply: FastifyReply) {
    await request.jwtVerify();
    if (request.user.role !== 'admin') {
      return reply.code(403).send({ message: 'Forbidden' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorizeAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
