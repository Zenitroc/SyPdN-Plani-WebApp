import { prisma } from '../Infrastructure/prisma.js';

export class CourseRepository {
  async listAll() { return prisma.course.findMany({ orderBy: { name: 'asc' } }); }
  async listForUser(userId: bigint) { return prisma.course.findMany({ where: { users: { some: { userId } } }, orderBy: { name: 'asc' } }); }
  async findById(id: bigint) { return prisma.course.findUnique({ where: { id } }); }
}
