// Qué rol puede hacer qué. Es el único lugar del front donde se nombran roles:
// las pantallas preguntan por capacidades (`can('students.edit')`), no por roles.
// Refleja los `require_role` de la API; si cambian allá, se ajusta acá.
export const CAPABILITIES = {
  'students.edit': ['GURU', 'SENIOR'],
  'students.delete': ['GURU'],
  'groups.edit': ['GURU', 'SENIOR'],
  'groups.conformity': ['GURU', 'SENIOR', 'AYUDANTE'],
  'assignments.edit': ['GURU', 'SENIOR', 'AYUDANTE'],
  'partials.edit': ['GURU', 'SENIOR'],
  'attendance.close': ['GURU', 'SENIOR'],
  'finals.view': ['GURU', 'SENIOR'],
  'finals.siu': ['GURU'],
  'planning.edit': ['GURU'],
  'news.edit': ['GURU'],
  'courses.color': ['GURU'],
  admin: ['GURU'],
} as const satisfies Record<string, readonly string[]>;

export type Capability = keyof typeof CAPABILITIES;

export const hasCapability = (roles: readonly string[] | undefined, capability: Capability): boolean =>
  (CAPABILITIES[capability] as readonly string[]).some(role => roles?.includes(role));

/** Los roles con acceso total ven todos los cursos, no solo los asignados. */
export const seesAllCourses = (roles: readonly string[] | undefined): boolean => hasCapability(roles, 'admin');
