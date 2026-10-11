import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CourseService } from '../Services/course.service.js';
import { requireUser } from '../Middleware/auth.js';

export async function courseRoutes(app: FastifyInstance) {
  const service = new CourseService();
  app.get('/api/courses', async (request, reply) => {
    const scope = z.enum(['mine', 'all']).catch('mine').parse((request.query as { scope?: string }).scope);
    const user = await requireUser(request); // fuera del try: sin token responde 401, no 403
    try { return { data: await service.list(user, scope) }; } catch (error) { return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'No tenés permiso para consultar estos cursos.' } }); }
  });
  app.get('/api/courses/:id', async (request, reply) => {
    const { id } = z.object({ id: z.coerce.bigint().positive() }).parse(request.params);
    const user = await requireUser(request);
    try { return { data: await service.get(user, id) }; } catch (error) { const status = error instanceof Error && error.message === 'COURSE_NOT_FOUND' ? 404 : 403; return reply.code(status).send({ error: { code: status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', message: status === 404 ? 'Curso no encontrado.' : 'No tenés permiso para acceder al curso.' } }); }
  });
}
