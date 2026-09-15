import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Card, EmptyState, LoadingState } from '../components/ui';

const modules: Record<string, { title: string; description: string; endpoint: (courseId: string) => string }> = {
  students: { title: 'Estudiantes', description: 'Consultá el padrón, estado y pertenencia a grupos.', endpoint: id => `/estudiantes?course_id=${id}` },
  groups: { title: 'Grupos', description: 'Organizá los equipos y revisá su composición.', endpoint: id => `/grupos?course_id=${id}` },
  assignments: { title: 'Trabajos Prácticos', description: 'Seguimiento de entregas, devoluciones y calificaciones.', endpoint: id => `/entregas?course_id=${id}` },
  partials: { title: 'Parciales', description: 'Resultados por tema e instancia de evaluación.', endpoint: id => `/parciales?course_id=${id}` },
  finals: { title: 'Notas finales', description: 'Condición final y calificaciones de la comisión.', endpoint: id => `/notas-finales?course_id=${id}` },
  attendance: { title: 'Asistencia', description: 'Registro de asistencia por parcial e instancia.', endpoint: id => `/asistencia?course_id=${id}&partial=1&attempt=PA` },
  planning: { title: 'Planificación', description: 'Plan de clases y seguimiento del curso.', endpoint: id => `/planificacion?course_id=${id}` },
  reports: { title: 'Reportes', description: 'Recursos y comunicaciones del espacio docente.', endpoint: () => '/reportes/config' },
};

export function ModulePage({ module }: { module: string }) {
  const { courseId } = useApp(); const config = modules[module]; const [data, setData] = useState<unknown>(null); const [error, setError] = useState('');
  useEffect(() => { if (!courseId && module !== 'reports') return; setData(null); setError(''); api.resource(config.endpoint(courseId)).then(setData).catch(reason => setError(reason.message)); }, [module, courseId]);
  if (!courseId && module !== 'reports') return <EmptyState title="Seleccioná un curso" description="Elegí un curso en la cabecera para continuar." />;
  if (error) return <EmptyState title="No se pudo cargar el módulo" description={error} />;
  if (data === null) return <LoadingState />;
  const rows = normalize(data);
  return <div className="page-stack native-module"><header className="page-heading"><div><p className="eyebrow">Gestión del curso</p><h2>{config.title}</h2><p className="muted">{config.description}</p></div><button className="quick-add">＋ Agregar</button></header><Card>{rows.length ? <DataPreview rows={rows} /> : <EmptyState title="Todavía no hay datos" description="Cuando haya información cargada aparecerá aquí." />}</Card></div>;
}
function normalize(data: unknown): Record<string, unknown>[] { if (Array.isArray(data)) return data as Record<string, unknown>[]; if (data && typeof data === 'object') { const value = data as Record<string, unknown>; for (const candidate of ['students', 'groups', 'assignments', 'resources', 'news']) if (Array.isArray(value[candidate])) return value[candidate] as Record<string, unknown>[]; } return []; }
function DataPreview({ rows }: { rows: Record<string, unknown>[] }) { const keys = Object.keys(rows[0]).filter(key => !['photo_data', 'photo_mime', 'p1', 'p2'].includes(key)).slice(0, 6); return <div className="table-scroll"><table><thead><tr>{keys.map(key => <th key={key}>{key.replaceAll('_', ' ')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.enrollment_id ?? index)}>{keys.map(key => <td key={key}>{typeof row[key] === 'object' ? '—' : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div>; }
