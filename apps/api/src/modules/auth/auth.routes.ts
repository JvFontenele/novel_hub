import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import {
  authResponseSchema,
  errorResponseSchema,
  fromZod,
} from '../../openapi/schemas.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Creates an account and returns a JWT for immediate authenticated use.',
      body: fromZod(registerSchema),
      response: {
        201: authResponseSchema,
        400: errorResponseSchema,
        409: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ message: 'Validation error', errors: body.error.format() });
    }

    const { name, email, password } = body.data;
    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return reply.code(409).send({ message: 'Email already registered' });
    }

    const passwordHash = await authService.hashPassword(password);
    const user = await authService.createUser(name, email, passwordHash);
    const token = fastify.jwt.sign({ sub: user.id, role: user.role });

    return reply.code(201).send({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  });

  fastify.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Authenticate a user',
      description: 'Validates email and password credentials and returns a JWT.',
      body: fromZod(loginSchema),
      response: {
        200: authResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ message: 'Validation error', errors: body.error.format() });
    }

    const { email, password } = body.data;
    const user = await authService.findUserByEmail(email);
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const valid = await authService.verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ sub: user.id, role: user.role });

    return reply.code(200).send({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  });
}
