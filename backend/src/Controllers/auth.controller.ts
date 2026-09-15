import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { requireUser } from '../middleware/auth.js';

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();
  app.post('/api/auth/login', async (request, reply) => {
    const input = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(request.body);
    try {
      const user = await service.authenticate(input.username.trim(), input.password);
      const token = await reply.jwtSign({ sub: user.id.toString(), name: user.name, roles: user.roles, courseIds: user.courseIds.map(String) }, { expiresIn: Number(process.env.JWT_EXP_SECONDS ?? 28_800) });
      return { data: { token, user: { id: Number(user.id), name: user.name, roles: user.roles, course_ids: user.courseIds.map(Number) } } };
    } catch { return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña inválidos.' } }); }
  });
  app.get('/api/me', async request => ({ data: await service.profile((await requireUser(request)).id) }));
}
