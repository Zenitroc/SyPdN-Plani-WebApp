import { Fragment, useMemo, useState } from 'react';
import { Async, Badge, Button, Card, EmptyState, GradeSelect, Modal, PageHeader, SearchInput, Segmented, Switch, cx } from '../components/ui';
import { partialLabel, useCatalog, type AttemptGrades } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { downloadCsv, matches, plural, slug } from '../lib/format';
import { invalidate, useApi } from '../lib/query';
import { useSavedFlash } from '../lib/useSavedFlash';

export type PartialRow = {
  enrollment_id: number;
  course_id_seq: number;
  status: string;
  apellido: string;
  nombre: string;
  legajo: string | null;
  group_no: number | null;
  p1: Record<string, AttemptGrades>;
  p2: Record<string, AttemptGrades>;
};
type Data = { students: PartialRow[]; grade_options: string[] };

const SHORT_ATTEMPT: Record<string, string> = { PA: 'Parc.' };
const RETAKES = 'RETAKES';
const gradesOf = (row: PartialRow, partial: number) => row[`p${partial}` as 'p1'] ?? {};

/** Estado de un parcial: aprobado, o los temas que todavía se adeudan. */
export function PartialStatus({ owed }: { owed: string[] }) {
  return owed.length ? <span className="owed">{owed.map(topic => <Badge key={topic} tone="danger">{topic}</Badge>)}</span> : <Badge tone="success" icon="check">AP</Badge>;
}

export default function PartialsPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const courseId = course!.id;
  const key = `/parciales?course_id=${courseId}`;
  const query = useApi<Data>(key);
  const [search, setSearch] = useState('');
  const [partial, setPartial] = useState('ALL');
  const [topic, setTopic] = useState('ALL');
  const [attempt, setAttempt] = useState('ALL');
  const [exporting, setExporting] = useState(false);
  const { flash, isSaved } = useSavedFlash();
  const canEdit = can('partials.edit');

  // En parciales solo se trabaja con estudiantes en ALTA.
  const active = useMemo(() => (query.data?.students ?? []).filter(row => row.status === 'ALTA'), [query.data]);

  // Columnas visibles según los filtros: parcial → temas → instancias.
  const columns = useMemo(() => catalog.partials
    .filter(item => partial === 'ALL' || String(item.number) === partial)
    .map(item => ({ ...item, topics: item.topics.filter(code => topic === 'ALL' || code === topic) }))
    .filter(item => item.topics.length), [catalog.partials, partial, topic]);
  const attempts = catalog.attemptCodes.filter((code, index) => attempt === 'ALL' || code === attempt || (attempt === RETAKES && index > 0));

  const save = async (row: PartialRow, partialNo: number, topicCode: string, attemptCode: string, code: string | null) => {
    const field = `p${partialNo}` as 'p1' | 'p2';
    query.setData(data => ({
      ...data,
      students: data.students.map(student => (student.enrollment_id === row.enrollment_id
        ? { ...student, [field]: { ...student[field], [topicCode]: { ...student[field][topicCode], [attemptCode]: code } } }
        : student)),
    }));
    try {
      await api.post('/parciales/guardar', { course_id: courseId, enrollment_id: row.enrollment_id, partial: partialNo, topic: topicCode, attempt: attemptCode, grade_code: code });
      flash(`${row.enrollment_id}-${topicCode}-${attemptCode}`);
      invalidate(path => path !== key);
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Parciales" description={canEdit ? 'Notas por tema en el parcial y sus recuperatorios. Se guardan al elegirlas.' : 'Notas por tema en el parcial y sus recuperatorios. Tu rol es de solo lectura.'}
        actions={active.length > 0 && <Button variant="secondary" icon="download" onClick={() => setExporting(true)}>Exportar</Button>} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por apellido o nombre…" />
        <Segmented label="Parcial" value={partial} onChange={value => { setPartial(value); setTopic('ALL'); }}
          options={[{ value: 'ALL', label: 'Ambos' }, ...catalog.partials.map(item => ({ value: String(item.number), label: partialLabel(item.number) }))]} />
        <select className="select select-inline" aria-label="Tema" value={topic} onChange={event => setTopic(event.target.value)}>
          <option value="ALL">Todos los temas</option>
          {catalog.partials.filter(item => partial === 'ALL' || String(item.number) === partial).flatMap(item => item.topics).map(code => <option key={code}>{code}</option>)}
        </select>
        <select className="select select-inline" aria-label="Instancia" value={attempt} onChange={event => setAttempt(event.target.value)}>
          <option value="ALL">Todas las instancias</option>
          {catalog.attempts.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
          <option value={RETAKES}>Solo recuperatorios</option>
        </select>
      </div>

      {active.length > 0 && (
        <Card className="owed-summary">
          <div>
            <h3>Adeudan por tema</h3>
            <p className="muted">Estudiantes en alta que todavía no aprobaron cada tema: es la cantidad de exámenes a imprimir para la próxima instancia.</p>
          </div>
          <div className="owed-groups">
            {catalog.partials.map(item => (
              <div key={item.number} className="owed-group">
                <span className="owed-group-label">{partialLabel(item.number)}</span>
                {item.topics.map(code => {
                  const count = active.filter(row => !catalog.topicPassed(gradesOf(row, item.number)[code])).length;
                  return <span key={code} className={cx('owed-count', !count && 'is-zero')}><b>{count}</b>{code}</span>;
                })}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="card-flush">
        <Async query={query}>
          {data => {
            const rows = active.filter(row => matches(search, `${row.apellido} ${row.nombre}`, row.course_id_seq));
            if (!rows.length) {
              return <EmptyState mascot={!active.length} icon="search" title={active.length ? 'Ningún estudiante coincide' : 'El curso no tiene estudiantes en alta'}
                description={active.length ? 'Revisá la búsqueda.' : 'Cargá el padrón desde la pantalla Estudiantes.'} />;
            }
            return (
              <div className="table-wrap">
                <table className="table table-compact grades-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="sticky-col col-id">ID</th>
                      <th rowSpan={2} className="sticky-col col-name sticky-end">Estudiante</th>
                      {catalog.partials.map(item => <th key={item.number} rowSpan={2} className="center">{item.number}°P</th>)}
                      {columns.flatMap(item => item.topics.map((code, index) => (
                        <th key={code} colSpan={attempts.length} className={cx('center topic-head', index === 0 && 'partial-start')}>{code} <small>· {item.number}°P</small></th>
                      )))}
                    </tr>
                    <tr>
                      {columns.flatMap(item => item.topics.flatMap((code, topicIndex) => attempts.map((attemptCode, index) => (
                        <th key={`${code}-${attemptCode}`} className={cx('center sub-head', index === 0 && 'topic-start', index === 0 && topicIndex === 0 && 'partial-start')} title={catalog.attemptLabel(attemptCode)}>{SHORT_ATTEMPT[attemptCode] ?? attemptCode}</th>
                      ))))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.enrollment_id}>
                        <td className="sticky-col col-id num">{row.course_id_seq}</td>
                        <td className="sticky-col col-name sticky-end"><span className="cell-main">{row.apellido}, {row.nombre}</span><span className="cell-sub">{row.group_no ? `Grupo ${row.group_no}` : 'Sin grupo'}</span></td>
                        {catalog.partials.map(item => <td key={item.number} className="center"><PartialStatus owed={catalog.owedTopics(item.topics, gradesOf(row, item.number))} /></td>)}
                        {columns.map(item => item.topics.map((code, topicIndex) => {
                          const grades = gradesOf(row, item.number)[code] ?? {};
                          return (
                            <Fragment key={code}>
                              {attempts.map((attemptCode, index) => {
                                const value = grades[attemptCode] ?? null;
                                // Si el tema ya se aprobó en una instancia anterior, las siguientes no hacen falta.
                                const settled = !value && catalog.attemptCodes.slice(0, catalog.attemptCodes.indexOf(attemptCode)).some(previous => catalog.passes(grades[previous]));
                                return (
                                  <td key={attemptCode} className={cx(index === 0 && 'topic-start', index === 0 && topicIndex === 0 && 'partial-start', settled && 'is-settled', isSaved(`${row.enrollment_id}-${code}-${attemptCode}`) && 'is-saved')}>
                                    <GradeSelect label={`${row.apellido}: ${code}, ${catalog.attemptLabel(attemptCode)}`} value={value} tone={catalog.gradeTone(value)} options={data.grade_options}
                                      disabled={!canEdit} onChange={next => save(row, item.number, code, attemptCode, next)} />
                                  </td>
                                );
                              })}
                            </Fragment>
                          );
                        }))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </Async>
      </Card>

      {exporting && <ExportModal rows={active} courseName={course!.name} onClose={() => setExporting(false)} />}
    </>
  );
}

/** Elegir qué parte de la planilla exportar: temas, instancias y datos del estudiante. */
function ExportModal({ rows, courseName, onClose }: { rows: PartialRow[]; courseName: string; onClose: () => void }) {
  const catalog = useCatalog();
  const allTopics = catalog.partials.flatMap(item => item.topics);
  const extras = [
    { code: 'legajo', label: 'Legajo' },
    { code: 'group', label: 'Grupo' },
    { code: 'status', label: 'Estado de cada parcial (AP o temas que adeuda)' },
  ];
  const everything = [...allTopics.map(code => `topic:${code}`), ...catalog.attemptCodes.map(code => `attempt:${code}`), ...extras.map(item => `extra:${item.code}`)];
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [onlyOwing, setOnlyOwing] = useState(false);
  const has = (id: string) => picked.has(id);
  const toggle = (id: string) => setPicked(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const setMany = (ids: string[], on: boolean) => setPicked(current => { const next = new Set(current); ids.forEach(id => (on ? next.add(id) : next.delete(id))); return next; });

  const topics = catalog.partials.map(item => ({ ...item, topics: item.topics.filter(code => has(`topic:${code}`)) })).filter(item => item.topics.length);
  const attempts = catalog.attemptCodes.filter(code => has(`attempt:${code}`));
  const selectedTopics = topics.flatMap(item => item.topics);
  // Sin temas elegidos, "adeudan" se evalúa sobre todos los temas.
  const owes = (row: PartialRow) => catalog.partials.some(item => item.topics.some(code => (!selectedTopics.length || selectedTopics.includes(code)) && !catalog.topicPassed(gradesOf(row, item.number)[code])));
  const exported = onlyOwing ? rows.filter(owes) : rows;
  // Las notas necesitan al menos un tema y una instancia; solo datos del estudiante también es válido.
  const gradesIncomplete = (selectedTopics.length > 0) !== (attempts.length > 0);
  const nothing = picked.size === 0;

  const download = () => {
    const headers = ['ID', 'Apellido', 'Nombre'];
    if (has('extra:legajo')) headers.push('Legajo');
    if (has('extra:group')) headers.push('Grupo');
    if (has('extra:status')) catalog.partials.forEach(item => headers.push(`${item.number}°P`));
    topics.forEach(item => item.topics.forEach(code => attempts.forEach(attemptCode => headers.push(`${code} ${attemptCode}`))));

    downloadCsv(`parciales-${slug(courseName)}`, headers, exported.map(row => {
      const cells: unknown[] = [row.course_id_seq, row.apellido, row.nombre];
      if (has('extra:legajo')) cells.push(row.legajo);
      if (has('extra:group')) cells.push(row.group_no);
      if (has('extra:status')) catalog.partials.forEach(item => cells.push(catalog.owedTopics(item.topics, gradesOf(row, item.number)).join(' ') || 'AP'));
      topics.forEach(item => item.topics.forEach(code => attempts.forEach(attemptCode => cells.push(gradesOf(row, item.number)[code]?.[attemptCode] ?? ''))));
      return cells;
    }));
    onClose();
  };

  const option = (id: string, label: string) => (
    <button key={id} type="button" className={`choice${has(id) ? ' is-active' : ''}`} aria-pressed={has(id)} onClick={() => toggle(id)}>{label}</button>
  );

  return (
    <Modal title="Exportar parciales" subtitle="Elegí qué incluir. Siempre van el ID, el apellido y el nombre." onClose={onClose}
      footer={<>
        <span className="export-count">{plural(exported.length, 'estudiante', 'estudiantes')}</span>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button icon="download" disabled={nothing || gradesIncomplete || !exported.length} onClick={download}>Exportar a Excel (CSV)</Button>
      </>}>
      <div className="form-actions">
        <Button variant="soft" size="sm" icon="check" onClick={() => setMany(everything, true)}>Seleccionar todo</Button>
        <Button variant="ghost" size="sm" disabled={nothing} onClick={() => setPicked(new Set())}>Quitar todo</Button>
      </div>

      {catalog.partials.map(item => {
        const ids = item.topics.map(code => `topic:${code}`);
        const all = ids.every(has);
        return (
          <div key={item.number} className="field">
            <span className="field-label">Temas del {partialLabel(item.number)} <button type="button" className="link-btn" onClick={() => setMany(ids, !all)}>{all ? 'quitar' : 'todos'}</button></span>
            <div className="choice-row">{item.topics.map(code => option(`topic:${code}`, code))}</div>
          </div>
        );
      })}
      <div className="field">
        <span className="field-label">Instancias</span>
        <div className="choice-row">{catalog.attempts.map(item => option(`attempt:${item.code}`, item.label))}</div>
      </div>
      <div className="field">
        <span className="field-label">Datos del estudiante</span>
        <div className="choice-row">{extras.map(item => option(`extra:${item.code}`, item.label))}</div>
      </div>
      <Switch label={selectedTopics.length ? 'Solo quienes adeudan alguno de los temas elegidos' : 'Solo quienes adeudan algún tema'} checked={onlyOwing} onChange={setOnlyOwing} />

      {nothing && <p className="form-note">Marcá qué querés exportar, o usá “Seleccionar todo”.</p>}
      {gradesIncomplete && <p className="form-note">Para exportar notas elegí al menos un tema y una instancia.</p>}
    </Modal>
  );
}
