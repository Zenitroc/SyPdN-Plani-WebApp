import type { AuthUser } from '../domain/auth.js';
import { CourseRepository } from '../repositories/course.repository.js';

export class CourseService {
  constructor(private readonly courses = new CourseRepository()) {}
  async list(user: AuthUser, scope: 'mine' | 'all') {
    if (scope === 'all' && !user.roles.includes('GURU')) throw new Error('FORBIDDEN');
    const rows = scope === 'all' ? await this.courses.listAll() : await this.courses.listForUser(user.id);
    return rows.map(course => ({ id: Number(course.id), code: course.code, name: course.name, term: course.term ?? '', is_active: course.isActive }));
  }
  async get(user: AuthUser, id: bigint) {
    if (!user.roles.includes('GURU') && !user.courseIds.includes(id)) throw new Error('FORBIDDEN');
    const course = await this.courses.findById(id);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    return { id: Number(course.id), code: course.code, name: course.name, term: course.term ?? '', is_active: course.isActive };
  }
}
