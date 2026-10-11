import { useState } from 'react';
import { Async, Button, Card, Check, EmptyState, PageHeader, SearchInput, Segmented, Switch, cx } from '../components/ui';
import { partialLabel, useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { downloadCsv, matches, plural, slug } from '../lib/format';
import { invalidate, useApi } from '../lib/query';
import { useSavedFlash } from '../lib/useSavedFlash';

type Row = {
  enrollment_id: number;
  course_id_seq: number;
  apellido: string;
  nombre: string;
  status?: string;
  present: boolean | number;
  topics: Record<string, boolean | number>;
  approved_topics: Record<string, number>;
};
type Data = { students: Row[]; topics: string[] };
type CloseResult = { absent: number; not_delivered: number; kept: number; students: number };

export default function AttendancePage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast, confirm } = useFeedback();
  const catalog = useCatalog();
  const courseId = course!.id;
  const [partial, setPartial] = useState(String(catalog.partials[0]?.number ?? 1));
  const [attempt, setAttempt] = useState(catalog.attemptCodes[0] ?? 'PA');
  const [search, setSearch] = useState('');
  // En los recuperatorios se listan por defecto solo quienes adeudan; se puede abrir a todos
  // para anotar a quien ya aprobó y viene a levantar nota.
  const [showAll, setShowAll] = useState(false);
  const [closing, setClosing] = useState(false);
  const key = `/asistencia?course_id=${courseId}&partial=${partial}&attempt=${attempt}`;
  const query = useApi<Data>(key);
  const { flash, isSaved } = useSavedFlash();
  const isRetake = attempt !== catalog.attemptCodes[0];
  const onlyOwing = isRetake && !showAll;

  const save = async (row: Row, present: boolean, topics: Record<string, boolean>) => {
    query.setData(data => ({ ...data, students: data.students.map(item => (item.enrollment_id === row.enrollment_id ? { ...item, present, topics } : item)) }));
    try {
      await api.post('/asistencia/guardar', {
        course_id: courseId, enrollment_id: row.enrollment_id, partial: Number(partial), attempt, present: Number(present),
        topics: Object.fromEntries(Object.entries(topics).map(([topic, delivered]) => [topic, Number(delivered)])),
      });
      flash(String(row.enrollment_id));
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const title = `${partialLabel(partial)} · ${catalog.attemptLabel(attempt)}`;
  const { absent: absentCode, not_delivered: notDeliveredCode } = catalog.attendance_close;

  const close = async (data: Data, active: Row[]) => {
    const owedTopics = (row: Row) => data.topics.filter(topic => !row.approved_topics[topic]);
    const absentees = active.filter(row => !row.present && owedTopics(row).length > 0).length;
    const incomplete = active.filter(row => row.present && owedTopics(row).some(topic => !row.topics[topic])).length;
    const accepted = await confirm({
      title: `Cerrar asistencia: ${title}`, tone: 'primary', confirmLabel: 'Cerrar asistencia',
      message: (
        <div className="close-summary">
          <p>Se cargan en Parciales las notas de quienes no rindieron, solo en los temas que adeudan:</p>
          <ul>
            <li><b>{plural(absentees, 'ausente', 'ausentes')}</b> → <code>{absentCode}</code> en cada tema adeudado.</li>
            <li><b>{plural(incomplete, 'presente', 'presentes')}</b> con temas sin entregar → <code>{notDeliveredCode}</code> en esos temas.</li>
          </ul>
          <p>Los temas ya aprobados y las notas ya cargadas en esta instancia no se tocan. Podés volver a cerrar si corregís la asistencia.</p>
        </div>
      ),
    });
    if (!accepted) return;
    setClosing(true);
    try {
      const result = await api.post<CloseResult>('/asistencia/cerrar', { course_id: courseId, partial: Number(partial), attempt });
      const loaded = result.absent + result.not_delivered;
      toast.success(loaded
        ? `Asistencia cerrada: ${plural(result.absent, `nota ${absentCode}`, `notas ${absentCode}`)} y ${plural(result.not_delivered, `nota ${notDeliveredCode}`, `notas ${notDeliveredCode}`)} en ${plural(result.students, 'estudiante', 'estudiantes')}.${result.kept ? ` ${plural(result.kept, 'nota ya cargada se conservó', 'notas ya cargadas se conservaron')}.` : ''}`
        : 'Asistencia cerrada: no había notas para cargar.');
      invalidate();
    } catch (reason) { toast.error(reason); }
    setClosing(false);
  };

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Asistencia a parciales" description="Marcá quién se presentó y qué temas rindió en cada instancia. Cada cambio se guarda solo." />

      <div className="toolbar">
        <Segmented label="Parcial" value={partial} onChange={setPartial} options={catalog.partials.map(item => ({ value: String(item.number), label: partialLabel(item.number) }))} />
        <Segmented label="Instancia" value={attempt} onChange={value => { setAttempt(value); setShowAll(false); }} options={catalog.attempts.map(item => ({ value: item.code, label: item.label }))} />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar estudiante…" />
        {isRetake && <Switch label="Solo quienes adeudan" checked={onlyOwing} onChange={checked => setShowAll(!checked)} />}
      </div>

      <Async query={query}>
        {data => {
          // La asistencia se toma solo a estudiantes en ALTA.
          const active = data.students.filter(row => row.status !== 'BAJA');
          const owes = (row: Row) => data.topics.some(topic => !row.approved_topics[topic]);
          // Quien ya fue marcado presente queda a la vista aunque no adeude (vino a levantar nota).
          const listed = onlyOwing ? active.filter(row => owes(row) || Boolean(row.present)) : active;
          const rows = listed.filter(row => matches(search, `${row.apellido} ${row.nombre}`, row.course_id_seq));
          const present = listed.filter(row => row.present).length;
          if (!active.length) return <Card><EmptyState mascot title="El curso no tiene estudiantes en alta" description="Cargá el padrón desde la pantalla Estudiantes." /></Card>;
          return (
            <div className="attendance-layout">
              <Card className="card-flush">
                <h2 className="print-title">{course!.name} · {title}</h2>
                {!rows.length ? (
                  <EmptyState icon={listed.length ? 'search' : 'check-circle'} title={listed.length ? 'Ningún estudiante coincide' : 'Nadie adeuda temas de este parcial'}
                    description={listed.length ? 'Revisá la búsqueda.' : 'Desactivá “Solo quienes adeudan” para anotar a quien viene a levantar nota.'}
                    action={!listed.length ? <Button variant="secondary" onClick={() => setShowAll(true)}>Ver a todos</Button> : undefined} />
                ) : (
                  <div className="table-wrap">
                    <table className="table attendance-table">
                      <thead>
                        <tr>
                          <th className="tight">ID</th>
                          <th>Estudiante</th>
                          <th className="center">Presente</th>
                          {data.topics.map(topic => <th key={topic} className="center">{topic}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => {
                          const isPresent = Boolean(row.present);
                          const topics = Object.fromEntries(data.topics.map(topic => [topic, Boolean(row.topics[topic])]));
                          return (
                            <tr key={row.enrollment_id} className={cx(isPresent && 'is-present', isSaved(String(row.enrollment_id)) && 'row-saved')}>
                              <td className="num tight">{row.course_id_seq}</td>
                              <td className="cell-main">{row.apellido}, {row.nombre}</td>
                              <td className="center">
                                {/* Marcar ausente limpia los temas: no pudo rendirlos. */}
                                <Switch label={<span className="sr-only">Presente</span>} checked={isPresent} onChange={checked => save(row, checked, checked ? topics : Object.fromEntries(data.topics.map(topic => [topic, false])))} />
                              </td>
                              {data.topics.map(topic => {
                                const approved = Boolean(row.approved_topics[topic]);
                                return (
                                  <td key={topic} className={cx('center topic-cell', approved ? 'is-approved' : topics[topic] && 'is-delivered')}>
                                    <Check label={`${row.apellido} rinde ${topic}${approved ? ' (ya aprobado)' : ''}`} checked={topics[topic]} disabled={!isPresent}
                                      onChange={checked => save(row, true, { ...topics, [topic]: checked })} />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2}>Totales</td>
                          <td className="center nowrap">{present} presentes · {listed.length - present} ausentes</td>
                          {data.topics.map(topic => <td key={topic} className="center">{listed.filter(row => row.topics[topic]).length}</td>)}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>

              <aside className="attendance-side">
                <Card title="Resumen">
                  <div className="attendance-total">
                    <strong>{present}</strong><span>de {listed.length} presentes</span>
                  </div>
                  {onlyOwing && <p className="field-hint">Se listan {listed.length} de {active.length} estudiantes en alta: quienes adeudan algún tema o ya están presentes.</p>}
                  <ul className="legend-dots">
                    <li><i className="dot-approved" /> Tema ya aprobado</li>
                    <li><i className="dot-delivered" /> Lo rinde en esta instancia</li>
                    <li><i className="dot-missing" /> Todavía lo adeuda</li>
                  </ul>
                </Card>
                <Card title="Al terminar">
                  <div className="form-stack">
                    {can('attendance.close') && (
                      <>
                        <Button icon="lock" busy={closing} onClick={() => close(data, active)}>Cerrar asistencia</Button>
                        <p className="field-hint">Carga en Parciales <b>{absentCode}</b> a los ausentes y <b>{notDeliveredCode}</b> a los temas no entregados, solo en lo que cada uno adeuda.</p>
                      </>
                    )}
                    <Button variant="secondary" icon="download" onClick={() => downloadCsv(`asistencia-${slug(course!.name)}-p${partial}-${attempt}`, ['ID', 'Apellido', 'Nombre', 'Presente', ...data.topics],
                      rows.map(row => [row.course_id_seq, row.apellido, row.nombre, row.present ? 'Sí' : 'No', ...data.topics.map(topic => (row.approved_topics[topic] ? 'Aprobado' : row.topics[topic] ? 'Rinde' : ''))]))}>Excel (CSV)</Button>
                    <Button variant="secondary" icon="printer" onClick={() => window.print()}>Imprimir / PDF</Button>
                  </div>
                </Card>
              </aside>
            </div>
          );
        }}
      </Async>
    </>
  );
}
