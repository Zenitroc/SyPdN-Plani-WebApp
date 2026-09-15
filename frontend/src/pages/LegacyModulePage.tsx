import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/ui';

const pages = {
  students: ['Estudiantes', '/pages/estudiantes/index.html'], groups: ['Grupos', '/pages/grupos/index.html'], assignments: ['Entregas', '/pages/entregas/index.html'], partials: ['Parciales', '/pages/parciales/index.html'], finals: ['Notas finales', '/pages/notas-finales/index.html'], attendance: ['Asistencia', '/pages/asistencia/index.html'], planning: ['Planificación', '/pages/planificacion/index.html'], reports: ['Reportes', '/pages/reportes/index.html'], 'admin/courses': ['Administración de cursos', '/pages/cursos-admin/index.html'], 'admin/users': ['Administración de usuarios', '/pages/usuarios-admin/index.html'],
};
export function LegacyModulePage({ module }) {
  const { courseId } = useApp(); const [title, path] = pages[module];
  if (!courseId && !module.startsWith('admin') && module !== 'reports') return <EmptyState title="Seleccioná un curso" description="Elegí el contexto de trabajo antes de continuar." />;
  return <div className="page-stack module-frame"><section className="page-heading"><div><p className="eyebrow">Módulo</p><h2>{title}</h2><p className="muted">Las operaciones disponibles se mantienen mientras este módulo completa su migración a componentes React.</p></div></section><iframe title={title} src={path} /></div>;
}
