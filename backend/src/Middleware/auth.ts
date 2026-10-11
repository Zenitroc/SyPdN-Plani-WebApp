import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../Domain/auth.js';

declare module '@fastify/jwt' { interface FastifyJWT { payload: { sub: string; name: string; roles: string[]; courseIds: string[] }; user: { sub: string; name: string; roles: string[]; courseIds: string[] }; } }
export async function requireUser(request: FastifyRequest): Promise<AuthUser> {
  await request.jwtVerify();
  return { id: BigInt(request.user.sub), name: request.user.name, roles: request.user.roles, courseIds: request.user.courseIds.map(BigInt) };
}
