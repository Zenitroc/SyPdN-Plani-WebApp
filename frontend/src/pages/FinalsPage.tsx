import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Async, Badge, Button, Card, Check, EmptyState, PageHeader, SearchInput, Segmented, Switch, cx } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { downloadCsv, matches, percent, plural, slug } from '../lib/format';
import { invalidate, useApi } from '../lib/query';
import { useSavedFlash } from '../lib/useSavedFlash';
import { PartialStatus, type PartialRow } from './PartialsPage';

type Row = PartialRow & {
  observaciones: string | null;
  tps_1c: number | null;
  tps_2c: number | null;
  final_grade: number | null;
  final_deserto: number;
  final_condition: string | null;
  siu_loaded: number;
};
type Data = { students: Row[] };

const ABSENT = 'DESERTO';
const CONDITION_TONE: Record<string, 'success' | 'info' | 'danger' | 'neutral'> = { PROMOCIONA: 'success', FIRMA: 'info', RECURSA: 'danger', DESERTO: 'neutral' };

export default function FinalsPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const courseId = course!.id;
  const key = `/notas-finales?course_id=${courseId}`;
  const query = useApi<Data>(key);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALTA');
  const [siu, setSiu] = useState('ALL');
  const [detail, setDetail] = useState(false);
  const { flash, isSaved } = useSavedFlash();
  const canSiu = can('finals.siu');
  const grades = Array.from({ length: catalog.final.max - catalog.final.min + 1 }, (_, index) => catalog.final.min + index);

  const patch = (id: number, change: Partial<Row>) =>
    query.setData(data => ({ ...data, students: data.students.map(row => (row.enrollment_id === id ? { ...row, ...change } : row)) }));

  const owed = (row: Row) => catalog.partials.map(item => catalog.owedTopics(item.topics, row[`p${item.number}` as 'p1']));
  /** Cumple parciales y TPs: ya debería estar cargado en el SIU. */
  const readyForSiu = (row: Row) => owed(row).every(topics => !topics.length) && [row.tps_1c, row.tps_2c].every(ratio => Number(ratio) > catalog.tp_approval_threshold);
  const conditionOf = (row: Row) => row.final_condition ?? catalog.finalCondition(row.final_grade, Boolean(row.final_deserto));

  const saveFinal = async (row: Row, value: string) => {
    const final_deserto = Number(value === ABSENT);
    const final_grade = value && value !== ABSENT ? Number(value) : null;
    patch(row.enrollment_id, { final_grade, final_deserto, final_condition: catalog.finalCondition(final_grade, Boolean(final_deserto)) });
    try {
      await api.post('/notas-finales/guardar', { course_id: courseId, enrollment_id: row.enrollment_id, final_grade, final_deserto });
      flash(`final-${row.enrollment_id}`);
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const saveSiu = async (row: Row, loaded: boolean) => {
    patch(row.enrollment_id, { siu_loaded: Number(loaded) });
    try {
      await api.post('/notas-finales/guardar', { course_id: courseId, enrollment_id: row.enrollment_id, siu_loaded: Number(loaded) });
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const saveNote = async (row: Row, text: string) => {
    if (text === (row.observaciones ?? '')) return;
    patch(row.enrollment_id, { observaciones: text });
    try {
      await api.post('/estudiantes/editar', { course_id: courseId, enrollment_id: row.enrollment_id, observaciones: text });
      flash(`note-${row.enrollment_id}`);
      invalidate(path => path !== key);
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const conditionLabel = (code: string | null) => (code ? catalog.final.conditions[code] ?? code : '—');

  const exportCsv = (rows: Row[]) => downloadCsv(`cierre-${slug(course!.name)}`,
    ['ID', 'Apellido', 'Nombre', 'Grupo', ...catalog.partials.map(item => `Adeuda ${item.number}°P`), 'TPs 1C', 'TPs 2C', 'Calificación final', 'Condición', 'Cargado en SIU', 'Observaciones'],
    rows.map(row => [row.course_id_seq, row.apellido, row.nombre, row.group_no, ...owed(row).map(topics => topics.join(' ') || 'AP'), percent(row.tps_1c), percent(row.tps_2c),
      row.final_deserto ? conditionLabel(ABSENT) : row.final_grade, conditionLabel(conditionOf(row)), Number(row.siu_loaded) ? 'Sí' : 'No', row.observaciones]));

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Calificación final" description="Cierre de cursada: estado de parciales y TPs, nota final, condición y carga en SIU."
        actions={query.data && <Button variant="secondary" icon="download" onClick={() => exportCsv(query.data!.students)}>Exportar a Excel (CSV)</Button>} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por apellido o nombre…" />
        <Segmented label="Estado" value={status} onChange={setStatus} options={[{ value: 'ALTA', label: 'En alta' }, { value: 'BAJA', label: 'Baja' }, { value: 'ALL', label: 'Todos' }]} />
        <Segmented label="SIU" value={siu} onChange={setSiu} options={[{ value: 'ALL', label: 'Todos' }, { value: 'LOADED', label: 'Cargados' }, { value: 'PENDING', label: 'Sin cargar' }]} />
        <Switch label="Detalle de parciales" checked={detail} onChange={setDetail} />
      </div>

      <Async query={query}>
        {data => {
          const rows = data.students.filter(row => (status === 'ALL' || row.status === status)
            && (siu === 'ALL' || (siu === 'LOADED') === Boolean(Number(row.siu_loaded)))
            && matches(search, `${row.apellido} ${row.nombre}`, row.course_id_seq));
          const pending = data.students.filter(row => readyForSiu(row) && !Number(row.siu_loaded)).length;
          const summary = Object.keys(catalog.final.conditions).map(code => ({ code, count: data.students.filter(row => conditionOf(row) === code).length })).filter(item => item.count);
          return (
            <>
              {(summary.length > 0 || pending > 0) && (
                <div className="toolbar">
                  {summary.map(item => <Badge key={item.code} tone={CONDITION_TONE[item.code] ?? 'neutral'}>{conditionLabel(item.code)}: {item.count}</Badge>)}
                  {pending > 0 && <span className="siu-legend"><Icon name="star" size={14} /> {plural(pending, 'estudiante cumple', 'estudiantes cumplen')} todo y falta cargarlos en el SIU</span>}
                </div>
              )}
              <Card className="card-flush">
                {!rows.length ? (
                  <EmptyState mascot={!data.students.length} icon="search" title={data.students.length ? 'Ningún estudiante coincide' : 'El curso no tiene estudiantes'}
                    description={data.students.length ? 'Revisá la búsqueda y los filtros.' : 'Cargá el padrón desde la pantalla Estudiantes.'} />
                ) : (
                  <div className="table-wrap">
                    <table className="table table-compact grades-table">
                      <thead>
                        <tr>
                          <th className="sticky-col col-id">ID</th>
                          <th className="sticky-col col-name sticky-end">Estudiante</th>
                          {catalog.partials.map(item => <th key={item.number} className="center">{item.number}°P</th>)}
                          {detail && catalog.partials.flatMap(item => item.topics.map((topic, index) => <th key={topic} className={cx('center', index === 0 && 'partial-start')}>{topic}</th>))}
                          <th className="center">TPs 1C</th>
                          <th className="center">TPs 2C</th>
                          <th className="center">Nota final</th>
                          <th className="center">Condición</th>
                          <th className="center">SIU</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => {
                          const condition = conditionOf(row);
                          const loaded = Boolean(Number(row.siu_loaded));
                          return (
                            <tr key={row.enrollment_id} className={cx(row.status === 'BAJA' && 'is-muted', loaded && 'is-loaded')}>
                              <td className="sticky-col col-id num">
                                {row.course_id_seq}
                                {readyForSiu(row) && !loaded && <span className="siu-star" title="Cumple todo: falta cargar en el SIU"><Icon name="star" size={12} /></span>}
                              </td>
                              <td className="sticky-col col-name sticky-end"><span className="cell-main">{row.apellido}, {row.nombre}</span><span className="cell-sub">{row.group_no ? `Grupo ${row.group_no}` : 'Sin grupo'}</span></td>
                              {owed(row).map((topics, index) => <td key={index} className="center"><PartialStatus owed={topics} /></td>)}
                              {detail && catalog.partials.flatMap(item => item.topics.map((topic, index) => {
                                // Se muestra la nota que define el tema: la aprobada, o la última rendida.
                                const attempts = row[`p${item.number}` as 'p1']?.[topic] ?? {};
                                const codes = catalog.attemptCodes.map(code => attempts[code]).filter(Boolean) as string[];
                                const best = codes.find(catalog.passes) ?? codes[codes.length - 1] ?? null;
                                return <td key={topic} className={cx('center', index === 0 && 'partial-start')}><span className={`grade-pill grade-${catalog.gradeTone(best)}`}>{best ?? '—'}</span></td>;
                              }))}
                              {[row.tps_1c, row.tps_2c].map((ratio, index) => (
                                <td key={index} className="center num">{ratio == null ? <span className="muted">—</span> : <Badge tone={Number(ratio) > catalog.tp_approval_threshold ? 'success' : 'danger'}>{ratio}%</Badge>}</td>
                              ))}
                              <td className={cx('center', isSaved(`final-${row.enrollment_id}`) && 'is-saved')}>
                                <select className={`grade grade-${condition ? (condition === 'PROMOCIONA' ? 'top' : condition === 'FIRMA' ? 'pass' : 'fail') : 'empty'}`} aria-label={`Nota final de ${row.apellido}`}
                                  value={row.final_deserto ? ABSENT : row.final_grade ?? ''} onChange={event => saveFinal(row, event.target.value)}>
                                  <option value="">—</option>
                                  <option value={ABSENT}>{conditionLabel(ABSENT)}</option>
                                  {grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                                </select>
                              </td>
                              <td className="center">{condition ? <Badge tone={CONDITION_TONE[condition] ?? 'neutral'}>{conditionLabel(condition)}</Badge> : <span className="muted">—</span>}</td>
                              <td className="center">
                                {canSiu ? <Check tone="success" label={`${row.apellido} cargado en SIU`} checked={loaded} onChange={checked => saveSiu(row, checked)} /> : loaded ? <Badge tone="success" icon="check">Sí</Badge> : <span className="muted">—</span>}
                              </td>
                              <td className={cx('col-note', isSaved(`note-${row.enrollment_id}`) && 'is-saved')}>
                                <input className="input input-sm" aria-label={`Observaciones de ${row.apellido}`} defaultValue={row.observaciones ?? ''} placeholder="Agregar…"
                                  onBlur={event => saveNote(row, event.target.value.trim())} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          );
        }}
      </Async>
    </>
  );
}
