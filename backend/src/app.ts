import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { authRoutes } from './controllers/auth.controller.js';
import { courseRoutes } from './controllers/course.controller.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'warn' } });
  const origins = env.CORS_ORIGINS.split(',').map(value => value.trim());
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos.', details: error.flatten() } });
    app.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' } });
  });
  app.get('/api/ping', async () => ({ data: { pong: true } }));
  await app.register(authRoutes);
  await app.register(courseRoutes);
  return app;
}
