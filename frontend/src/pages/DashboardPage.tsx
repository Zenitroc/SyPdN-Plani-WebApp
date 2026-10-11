import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Donut, RatioList, TrendChart } from '../components/charts';
import { Async, Avatar, Badge, Card, EmptyState, Kpi, PageHeader, Skeleton } from '../components/ui';
import { termLabel, useCatalog } from '../context/catalog';
import { useCourse } from '../context/CourseContext';
import { daysUntil, formatDate, plural } from '../lib/format';
import { useApi } from '../lib/query';

type Student = { enrollment_id: number; apellido: string; nombre: string; group_no: number | null };
type Dashboard = {
  filters: { groups: { id: number; number: number; name: string | null }[]; topics: string[] };
  tpStats: { approved: number; graded: number; ratio: number | null };
  groupPerformance: { id: number; number: number; name: string | null; graded: number; ratio: number | null }[];
  topicStats: { topic: string; graded: number; ratio: number | null }[];
  parcialStats: { ratio: number | null; passed: number; total: number };
  alerts: { student: Student; adeuda: string[]; missing: string[]; groupRatio: number | null }[];
  highlights: { student: Student; avg: number; count: number }[];
  upcoming: { id: number; type: string; number: number; name: string; topic: string; due_date: string }[];
  tpStatus: { approved: number; failed: number; missing: number };
  tpHistory: { points: { date: string; ratio: number; graded: number; approved: number; label: string }[] };
};

const RISK_STEPS = [-10, 0, 10];
const MAX_ALERTS = 6;
const studentName = (student: Student) => `${student.apellido}, ${student.nombre}`;
/** Las entregas todavía sin corregir llegan con 0%: se omiten para no mostrar una caída que no existe. */
const history = (data: Dashboard) => data.tpHistory.points.filter(point => point.graded > 0);

function dueLabel(date: string): { text: string; tone: 'danger' | 'warning' | 'info' } {
  const days = daysUntil(date);
  if (days == null) return { text: formatDate(date), tone: 'info' };
  if (days === 0) return { text: 'Hoy', tone: 'danger' };
  if (days === 1) return { text: 'Mañana', tone: 'warning' };
  return { text: `En ${days} días`, tone: days <= 7 ? 'warning' : 'info' };
}

export default function DashboardPage() {
  const { course } = useCourse();
  const catalog = useCatalog();
  const [filters, setFilters] = useState({ term: 'ALL', topic: 'ALL', group_id: '', risk: String(catalog.tp_approval_threshold) });
  const query = useApi<Dashboard>(`/dashboard?${new URLSearchParams({ course_id: String(course!.id), ...filters })}`, { keepPrevious: true });
  const update = (name: keyof typeof filters) => (event: React.ChangeEvent<HTMLSelectElement>) => setFilters(current => ({ ...current, [name]: event.target.value }));
  const threshold = Number(filters.risk);

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Panorama del curso" description="Indicadores de trabajos prácticos y parciales para priorizar el seguimiento."
        actions={<>
          <select className="select select-inline" aria-label="Cuatrimestre" value={filters.term} onChange={update('term')}>
            <option value="ALL">Todo el año</option>
            {catalog.terms.map(term => <option key={term} value={term}>{termLabel(term)}</option>)}
          </select>
          <select className="select select-inline" aria-label="Tema" value={filters.topic} onChange={update('topic')}>
            <option value="ALL">Todos los temas</option>
            {(query.data?.filters.topics ?? []).map(topic => <option key={topic}>{topic}</option>)}
          </select>
          <select className="select select-inline" aria-label="Grupo" value={filters.group_id} onChange={update('group_id')}>
            <option value="">Todos los grupos</option>
            {(query.data?.filters.groups ?? []).map(group => <option key={group.id} value={group.id}>Grupo {group.number}{group.name ? ` · ${group.name}` : ''}</option>)}
          </select>
        </>} />

      <Async query={query} skeleton={<div className="kpi-grid">{[0, 1, 2, 3].map(item => <div key={item} className="kpi"><Skeleton width={40} height={40} radius={12} /><Skeleton width="60%" /><Skeleton width="40%" height={30} /></div>)}</div>}>
        {data => (
          <div className={`dashboard${query.fetching ? ' is-refreshing' : ''}`}>
            <section className="kpi-grid">
              <Kpi icon="clipboard" label="Aprobación de TPs" value={data.tpStats.ratio} suffix="%" meta={`${data.tpStats.approved} aprobadas de ${plural(data.tpStats.graded, 'corregida', 'corregidas')}`} />
              <Kpi icon="exam" tone="success" label="Parciales al día" value={data.parcialStats.ratio} suffix="%" meta={`${data.parcialStats.passed} de ${plural(data.parcialStats.total, 'estudiante', 'estudiantes')}`} />
              <Kpi icon="alert" tone="warning" label="Estudiantes en alerta" value={data.alerts.length} meta={`Adeudan temas o su grupo está ≤ ${threshold}%`} />
              <Kpi icon="calendar" tone="info" label="Próximas entregas" value={data.upcoming.length} meta="Con fecha y sin devolver" />
            </section>

            <section className="dashboard-grid">
              <Card title="Evolución de las entregas" className="span-2">
                {history(data).length
                  ? <TrendChart points={history(data)} />
                  : <EmptyState icon="trend" title="Sin entregas corregidas" description="Cuando haya trabajos prácticos corregidos vas a ver acá cómo evoluciona la aprobación." />}
              </Card>

              <Card title="Estado de los TPs">
                <Donut centerLabel="notas posibles" segments={[
                  { label: 'Aprobadas', value: data.tpStatus.approved, color: 'var(--success)' },
                  { label: 'Desaprobadas', value: data.tpStatus.failed, color: 'var(--danger)' },
                  { label: 'Sin corregir', value: data.tpStatus.missing, color: 'var(--border-strong)' },
                ]} />
              </Card>

              <Card title="Rendimiento por grupo" actions={<Link to="/app/assignments">Ver TPs</Link>}>
                {data.groupPerformance.length
                  ? <RatioList threshold={threshold} items={data.groupPerformance.map(group => ({ key: group.id, label: `Grupo ${group.number}${group.name ? ` · ${group.name}` : ''}`, ratio: group.ratio, hint: group.graded ? plural(group.graded, 'entrega corregida', 'entregas corregidas') : 'Sin entregas corregidas' }))} />
                  : <EmptyState icon="groups" title="Todavía no hay grupos" description="Creá los grupos del curso para comparar su rendimiento." />}
              </Card>

              <Card title="Temas a reforzar">
                {data.topicStats.length
                  ? <RatioList threshold={threshold} items={[...data.topicStats].sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0)).map(topic => ({ key: topic.topic, label: topic.topic, ratio: topic.ratio, hint: plural(topic.graded, 'nota cargada', 'notas cargadas') }))} />
                  : <EmptyState icon="clipboard" title="Sin notas de TPs" description="Los temas aparecen cuando se corrigen las primeras entregas." />}
              </Card>

              <Card title="Próximas entregas">
                {data.upcoming.length ? (
                  <ul className="people-list">
                    {data.upcoming.map((item, index) => {
                      const due = dueLabel(item.due_date);
                      return (
                        <li key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                          <span className="date-tile"><b>{formatDate(item.due_date, true).split(' ')[0]}</b>{formatDate(item.due_date, true).split(' ').slice(1).join(' ')}</span>
                          <div className="grow"><strong>{item.name || `${item.type} ${item.number}`}</strong><small>{item.type} {item.number} · {item.topic}</small></div>
                          <Badge tone={due.tone}>{due.text}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                ) : <EmptyState icon="calendar" title="Nada pendiente" description="No hay entregas con fecha próxima sin devolver." />}
              </Card>

              <Card title="Alertas de seguimiento" className="span-2" actions={
                <select className="select select-sm select-inline" aria-label="Umbral de aprobación del grupo" value={filters.risk} onChange={update('risk')}>
                  {RISK_STEPS.map(step => catalog.tp_approval_threshold + step).map(value => <option key={value} value={value}>Grupo ≤ {value}%</option>)}
                </select>}>
                {data.alerts.length ? (
                  <>
                    <ul className="people-list alert-list">
                      {data.alerts.slice(0, MAX_ALERTS).map((item, index) => (
                        <li key={item.student.enrollment_id} style={{ animationDelay: `${index * 40}ms` }}>
                          <Avatar name={`${item.student.nombre} ${item.student.apellido}`} size={34} />
                          <div className="grow">
                            <strong>{studentName(item.student)}</strong>
                            <small>{[item.adeuda.length && `Adeuda ${item.adeuda.join(', ')}`, item.missing.length && `Sin rendir ${item.missing.join(', ')}`].filter(Boolean).join(' · ') || 'Su grupo está por debajo del umbral'}</small>
                          </div>
                          {item.groupRatio != null && item.groupRatio <= threshold && <Badge tone="danger">TPs {item.groupRatio}%</Badge>}
                          <Badge tone={item.student.group_no ? 'neutral' : 'warning'}>{item.student.group_no ? `Grupo ${item.student.group_no}` : 'Sin grupo'}</Badge>
                        </li>
                      ))}
                    </ul>
                    {data.alerts.length > MAX_ALERTS && <p className="card-more">Y {plural(data.alerts.length - MAX_ALERTS, 'estudiante más', 'estudiantes más')}. <Link to="/app/partials">Ver parciales</Link></p>}
                  </>
                ) : <EmptyState mascot title="¡Todo en orden!" description="Ningún estudiante adeuda temas ni está en un grupo por debajo del umbral." />}
              </Card>

              <Card title="Mejores promedios">
                {data.highlights.length ? (
                  <ol className="people-list rank-list">
                    {data.highlights.map((item, index) => (
                      <li key={item.student.enrollment_id} style={{ animationDelay: `${index * 50}ms` }}>
                        <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                        <div className="grow"><strong>{studentName(item.student)}</strong><small>{plural(item.count, 'tema rendido', 'temas rendidos')}</small></div>
                        <Badge tone="success">{catalog.grades.scale[Math.round(item.avg) - 1] ?? item.avg.toFixed(1)}</Badge>
                      </li>
                    ))}
                  </ol>
                ) : <EmptyState icon="award" title="Sin notas de parciales" description="El ranking aparece con las primeras notas cargadas." />}
              </Card>
            </section>
          </div>
        )}
      </Async>
    </>
  );
}
