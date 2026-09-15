import bcrypt from 'bcryptjs';
import type { AuthUser } from '../domain/auth.js';
import { UserRepository } from '../repositories/user.repository.js';

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}
  async authenticate(username: string, password: string): Promise<AuthUser> {
    const user = await this.users.findByUsername(username);
    if (!user || !await bcrypt.compare(password, user.passwordHash)) throw new Error('INVALID_CREDENTIALS');
    return { id: user.id, name: user.name, roles: user.roles.map(item => item.role.code), courseIds: user.courses.map(item => item.courseId) };
  }
  async profile(id: bigint) {
    const user = await this.users.findProfile(id);
    if (!user) throw new Error('USER_NOT_FOUND');
    return { id: Number(user.id), name: user.name, last_name: user.lastName ?? '', username: user.username, email: user.email, personal_email: user.personalEmail ?? '', legajo: user.legajo ?? '', phone: user.phone ?? '', roles: user.roles.map(item => item.role.code), course_ids: user.courses.map(item => Number(item.courseId)), must_change_password: user.mustChangePassword };
  }
}
