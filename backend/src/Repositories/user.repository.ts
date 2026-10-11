import { prisma } from '../Infrastructure/prisma.js';

export class UserRepository {
  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username }, include: { roles: { include: { role: true } }, courses: true } });
  }

  async findProfile(id: bigint) {
    return prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } }, courses: true } });
  }
}
