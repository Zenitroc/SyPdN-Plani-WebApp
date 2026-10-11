import type { Capability } from './permissions';

export type NavItem = {
  /** Identificador estable: lo usan las rutas, el menú, el buscador y la guía. */
  key: string;
  path: string;
  label: string;
  icon: string;
  description: string;
  /** Solo visible/accesible con esta capacidad. */
  capability?: Capability;
  /** La pantalla trabaja sobre el curso seleccionado. */
  needsCourse?: boolean;
  /** Accesible por URL pero fuera del menú lateral. */
  hidden?: boolean;
};

export type NavSection = { label: string; items: NavItem[] };

// Fuente única de la navegación. Para sumar una pantalla: agregarla acá y registrar su
// componente en `pages/registry.ts`; el menú, las rutas y el buscador se arman solos.
export const NAV: NavSection[] = [
  {
    label: 'General',
    items: [
      { key: 'dashboard', path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard', description: 'Indicadores y alertas del curso', needsCourse: true },
      { key: 'courses', path: '/app/courses', label: 'Mis cursos', icon: 'book', description: 'Elegí el curso con el que trabajar' },
      { key: 'news', path: '/app/news', label: 'Novedades', icon: 'megaphone', description: 'Noticias, recursos y reportes' },
    ],
  },
  {
    label: 'Curso',
    items: [
      { key: 'students', path: '/app/students', label: 'Estudiantes', icon: 'users', description: 'Padrón, altas, bajas e importación', needsCourse: true },
      { key: 'groups', path: '/app/groups', label: 'Grupos', icon: 'groups', description: 'Equipos de trabajo y conformidad', needsCourse: true },
      { key: 'planning', path: '/app/planning', label: 'Planificación', icon: 'calendar', description: 'Plan de clases del curso', needsCourse: true },
    ],
  },
  {
    label: 'Evaluaciones',
    items: [
      { key: 'assignments', path: '/app/assignments', label: 'Trabajos prácticos', icon: 'clipboard', description: 'Entregas y notas por grupo', needsCourse: true },
      { key: 'partials', path: '/app/partials', label: 'Parciales', icon: 'exam', description: 'Notas por tema e instancia', needsCourse: true },
      { key: 'attendance', path: '/app/attendance', label: 'Asistencia', icon: 'attendance', description: 'Presentes y temas rendidos', needsCourse: true },
      { key: 'finals', path: '/app/finals', label: 'Calificación final', icon: 'award', description: 'Cierre de cursada y carga en SIU', needsCourse: true, capability: 'finals.view' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { key: 'admin-courses', path: '/app/admin/courses', label: 'Cursos', icon: 'settings', description: 'Alta de cursos y asignación de docentes', capability: 'admin' },
      { key: 'admin-users', path: '/app/admin/users', label: 'Usuarios', icon: 'shield', description: 'Cuentas, roles y accesos', capability: 'admin' },
      { key: 'admin-students', path: '/app/admin/students', label: 'Todos los estudiantes', icon: 'globe', description: 'Padrón consolidado de todos los cursos', capability: 'admin' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { key: 'profile', path: '/app/profile', label: 'Mi perfil', icon: 'user', description: 'Datos personales y contraseña', hidden: true },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap(section => section.items);

export const navItemByPath = (pathname: string): NavItem | undefined =>
  NAV_ITEMS.find(item => pathname === item.path || pathname.startsWith(`${item.path}/`));

export const HOME_PATH = '/app/dashboard';
export const PROFILE_PATH = '/app/profile';
export const COURSES_PATH = '/app/courses';
