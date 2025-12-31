export const routes = {
  login: { title: 'Ingresar', subtitle: 'Acceso a la plataforma', view: () => import('./views/login.js'), style: '/pages/login/login.css' },
  home: { title: 'Home', subtitle: 'Resumen de comisiones', view: () => import('./views/home.js') },
  'curso-dashboard': { title: 'Dashboard', subtitle: 'Indicadores del curso', view: () => import('./views/curso-dashboard.js') },
  planificacion: { title: 'Planificación', subtitle: 'Cronograma y objetivos', view: () => import('./views/planificacion.js') },
  estudiantes: { title: 'Estudiantes', subtitle: 'Listado y seguimiento', view: () => import('./views/estudiantes.js') },
  grupos: { title: 'Grupos', subtitle: 'Organización de equipos', view: () => import('./views/grupos.js') },
  entregas: { title: 'Entregas', subtitle: 'Trabajos prácticos', view: () => import('./views/entregas.js') },
  parciales: { title: 'Parciales', subtitle: 'Evaluaciones y notas', view: () => import('./views/parciales.js') },
  asistencia: { title: 'Asistencia', subtitle: 'Registro de asistencia', view: () => import('./views/asistencia.js') },
  reportes: { title: 'Reportes', subtitle: 'Reportes y análisis', view: () => import('./views/reportes.js') },
  perfil: { title: 'Perfil', subtitle: 'Datos personales', view: () => import('./views/perfil.js') },
  'alumnos-global': { title: 'Alumnos', subtitle: 'Vista global', view: () => import('./views/alumnos-global.js') },
  'cursos-admin': { title: 'Cursos', subtitle: 'Administración de cursos', view: () => import('./views/cursos-admin.js') },
  'usuarios-admin': { title: 'Usuarios', subtitle: 'Administración de usuarios', view: () => import('./views/usuarios-admin.js') },
};

export const routeAliases = {
  alumnos: 'alumnos-global',
};