export const routes = {
  login: { title: 'Ingresar', subtitle: 'Acceso a la plataforma', html: '/pages/login/index.html', script: '/pages/login/login.js', style: '/pages/login/login.css' },
  home: { title: 'Home', subtitle: 'Resumen de comisiones', html: '/pages/home/index.html', script: '/pages/home/home.js' },
  'curso-dashboard': { title: 'Dashboard', subtitle: 'Indicadores del curso', html: '/pages/curso-dashboard/index.html', script: '/pages/curso-dashboard/dashboard.js' },
  planificacion: { title: 'Planificación', subtitle: 'Cronograma y objetivos', html: '/pages/planificacion/index.html', script: '/pages/planificacion/planificacion.js' },
  estudiantes: { title: 'Estudiantes', subtitle: 'Listado y seguimiento', html: '/pages/estudiantes/index.html', script: '/pages/estudiantes/estudiantes.js' },
  grupos: { title: 'Grupos', subtitle: 'Organización de equipos', html: '/pages/grupos/index.html', script: '/pages/grupos/grupos.js' },
  entregas: { title: 'Entregas', subtitle: 'Trabajos prácticos', html: '/pages/entregas/index.html', script: '/pages/entregas/entregas.js' },
  parciales: { title: 'Parciales', subtitle: 'Evaluaciones y notas', html: '/pages/parciales/index.html', script: '/pages/parciales/parciales.js' },
  asistencia: { title: 'Asistencia', subtitle: 'Registro de asistencia', html: '/pages/asistencia/index.html', script: '/pages/asistencia/asistencia.js' },
  reportes: { title: 'Reportes', subtitle: 'Reportes y análisis', html: '/pages/reportes/index.html', script: '/pages/reportes/reportes.js' },
  perfil: { title: 'Perfil', subtitle: 'Datos personales', html: '/pages/perfil/index.html', script: '/pages/perfil/perfil.js' },
  'alumnos-global': { title: 'Alumnos', subtitle: 'Vista global', html: '/pages/alumnos-global/index.html', script: '/pages/alumnos-global/global.js' },
  'cursos-admin': { title: 'Cursos', subtitle: 'Administración de cursos', html: '/pages/cursos-admin/index.html', script: '/pages/cursos-admin/cursos-admin.js' },
  'usuarios-admin': { title: 'Usuarios', subtitle: 'Administración de usuarios', html: '/pages/usuarios-admin/index.html', script: '/pages/usuarios-admin/usuarios-admin.js' },
};

export const routeAliases = {
  alumnos: 'alumnos-global',
};