import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Async, Badge, Button, Card, Check, EmptyState, Field, Menu, MenuItem, Modal, PageHeader, SearchInput, Segmented } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { downloadCsv, matches, plural, slug } from '../lib/format';
import { invalidate, useApi } from '../lib/query';

export type Student = {
  id: number;
  course_id_seq: number;
  status: string;
  apellido: string;
  nombre: string;
  legajo: string | null;
  email_inst: string | null;
  group_no: number | null;
  observaciones: string | null;
};
type Group = { id: number; number: number; name: string | null };
type SortKey = 'course_id_seq' | 'apellido' | 'legajo' | 'group_no' | 'status';

const LEGAJO_MAX = 10;
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'course_id_seq', label: 'ID' },
  { key: 'apellido', label: 'Estudiante' },
  { key: 'legajo', label: 'Legajo' },
  { key: 'group_no', label: 'Grupo' },
  { key: 'status', label: 'Estado' },
];
const IMPORT_FORMATS = {
  standard: { label: 'Estándar', help: <>Columnas <code>apellido</code>, <code>nombre</code>, <code>legajo</code>, <code>email_inst</code>, separadas por coma o punto y coma. La fila de títulos es opcional.</> },
  siu: { label: 'Exportación del SIU', help: <>Tal como lo descarga el SIU: primera fila de títulos y columnas <code>B</code> legajo, <code>C</code> “Apellido, Nombre” y <code>E</code> e-mail. El resto se ignora.</> },
} as const;

export const groupLabel = (group: { number: number; name?: string | null }) => `Grupo ${group.number}${group.name ? ` · ${group.name}` : ''}`;

export default function StudentsPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast, confirm } = useFeedback();
  const courseId = course!.id;
  const students = useApi<Student[]>(`/estudiantes?course_id=${courseId}`);
  const groups = useApi<Group[]>(`/grupos?course_id=${courseId}`);
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'course_id_seq', desc: false });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Student | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const canEdit = can('students.edit');

  const all = students.data ?? [];
  const visible = useMemo(() => {
    const rows = all.filter(row => (status === 'ALL' || row.status === status) && matches(query, `${row.apellido} ${row.nombre}`, row.legajo, row.email_inst, row.course_id_seq));
    const direction = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const left = a[sort.key] ?? '';
      const right = b[sort.key] ?? '';
      return direction * (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es', { numeric: true }));
    });
  }, [all, status, query, sort]);

  const counts = { ALL: all.length, ALTA: all.filter(row => row.status === 'ALTA').length, BAJA: all.filter(row => row.status === 'BAJA').length };
  const picked = visible.filter(row => selected.has(row.id));
  const allPicked = visible.length > 0 && picked.length === visible.length;

  const toggle = (id: number) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const refresh = () => { setSelected(new Set()); invalidate(); };

  /** Aplica el mismo cambio a cada seleccionado e informa cuántos fallaron, sin cortar en el primero. */
  const applyToPicked = async (label: string, change: Record<string, unknown>) => {
    const results = await Promise.allSettled(picked.map(row => api.post('/estudiantes/editar', { course_id: courseId, enrollment_id: row.id, ...change })));
    const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    refresh();
    if (failed.length) toast.error(`${failed.length} de ${picked.length} no se pudieron actualizar. ${errorMessage(failed[0].reason)}`);
    else toast.success(`${plural(picked.length, 'estudiante', 'estudiantes')}: ${label}.`);
  };

  const assignGroup = async (groupNumber: number | null) => {
    try {
      await api.post('/grupos/asignar', { course_id: courseId, group_number: groupNumber, enrollment_ids: picked.map(row => row.id) });
      toast.success(groupNumber ? `Asignados al grupo ${groupNumber}.` : 'Quitados de su grupo.');
      refresh();
    } catch (reason) { toast.error(reason); }
  };

  const remove = async () => {
    const accepted = await confirm({
      title: `Eliminar ${plural(picked.length, 'inscripción', 'inscripciones')}`,
      message: 'Se borran del curso junto con sus notas y asistencias. Esta acción no se puede deshacer; si solo dejaron de cursar, conviene darlos de baja.',
      confirmLabel: 'Eliminar', requireText: 'ELIMINAR',
    });
    if (!accepted) return;
    try {
      await api.post('/estudiantes/eliminar', { course_id: courseId, enrollment_ids: picked.map(row => row.id), confirm: 'ELIMINAR' });
      toast.success('Inscripciones eliminadas.');
      refresh();
    } catch (reason) { toast.error(reason); }
  };

  const reassignIds = async () => {
    const accepted = await confirm({
      title: 'Reasignar IDs', tone: 'primary', confirmLabel: 'Reasignar',
      message: 'Los estudiantes en ALTA se renumeran por orden alfabético (apellido, nombre). Los IDs actuales cambian.',
    });
    if (!accepted) return;
    try {
      const result = await api.post<{ reassigned: number }>('/estudiantes/reasignar-ids', { course_id: courseId, scope: 'ALTA' });
      toast.success(`${plural(result.reassigned, 'ID reasignado', 'IDs reasignados')}.`);
      refresh();
    } catch (reason) { toast.error(reason); }
  };

  const exportCsv = () => downloadCsv(`estudiantes-${slug(course!.name)}`, ['N°', 'ID', 'Apellido', 'Nombre', 'Legajo', 'Email', 'Grupo', 'Estado', 'Observaciones'],
    visible.map((row, index) => [index + 1, row.course_id_seq, row.apellido, row.nombre, row.legajo, row.email_inst, row.group_no, row.status, row.observaciones]));

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Estudiantes" description="Padrón del curso: altas, bajas, grupos y observaciones."
        actions={<>
          <Menu trigger={props => <Button variant="secondary" icon="more" {...props}>Más</Button>}>
            {close => (
              <>
                <MenuItem icon="download" onClick={() => { close(); exportCsv(); }}>Exportar a Excel (CSV)</MenuItem>
                {canEdit && <MenuItem icon="sort" onClick={() => { close(); void reassignIds(); }}>Reasignar IDs (A→Z)</MenuItem>}
              </>
            )}
          </Menu>
          {canEdit && <Button variant="secondary" icon="upload" onClick={() => setImporting(true)}>Importar CSV</Button>}
          {canEdit && <Button icon="plus" onClick={() => setEditing('new')}>Nuevo estudiante</Button>}
        </>} />

      <div className="toolbar">
        <SearchInput value={query} onChange={value => setParams(value ? { q: value } : {}, { replace: true })} placeholder="Buscar por apellido, legajo o email…" />
        <Segmented label="Estado" value={status} onChange={setStatus} options={[
          { value: 'ALL', label: `Todos · ${counts.ALL}` },
          { value: 'ALTA', label: `Alta · ${counts.ALTA}` },
          { value: 'BAJA', label: `Baja · ${counts.BAJA}` },
        ]} />
      </div>

      {picked.length > 0 && (
        <div className="selection-bar" role="region" aria-label="Acciones sobre la selección">
          <strong>{plural(picked.length, 'seleccionado', 'seleccionados')}</strong>
          {canEdit && (
            <>
              <Button variant="soft" size="sm" onClick={() => applyToPicked('dados de alta', { status: 'ALTA' })}>Dar de alta</Button>
              <Button variant="soft" size="sm" onClick={() => applyToPicked('dados de baja', { status: 'BAJA' })}>Dar de baja</Button>
              <select className="select select-sm select-inline" aria-label="Asignar a un grupo" value=""
                onChange={event => { if (event.target.value) void assignGroup(event.target.value === 'none' ? null : Number(event.target.value)); }}>
                <option value="">Asignar a grupo…</option>
                {(groups.data ?? []).map(group => <option key={group.id} value={group.number}>{groupLabel(group)}</option>)}
                <option value="none">Sin grupo</option>
              </select>
            </>
          )}
          {can('students.delete') && <Button variant="ghost" size="sm" icon="trash" className="is-danger-text" onClick={remove}>Eliminar</Button>}
          <span className="toolbar-spacer" />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
        </div>
      )}

      <Card className="card-flush">
        <Async query={students}>
          {() => !visible.length ? (
            <EmptyState mascot={!all.length} icon="search" title={all.length ? 'Ningún estudiante coincide' : 'El padrón está vacío'}
              description={all.length ? 'Probá con otra búsqueda o cambiá el filtro de estado.' : 'Cargá a los estudiantes de a uno o importá la lista completa desde un CSV.'}
              action={!all.length && canEdit ? <Button icon="upload" onClick={() => setImporting(true)}>Importar CSV</Button> : undefined} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="tight"><Check label="Seleccionar todos" checked={allPicked} onChange={checked => setSelected(checked ? new Set(visible.map(row => row.id)) : new Set())} /></th>
                    <th className="tight" title="Número de orden en la lista que estás viendo">N°</th>
                    {COLUMNS.map(column => (
                      <th key={column.key} className={column.key === 'legajo' ? 'hide-sm' : undefined} aria-sort={sort.key === column.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                        <button type="button" className={`th-sort${sort.key === column.key ? ' is-active' : ''}`}
                          onClick={() => setSort(current => ({ key: column.key, desc: current.key === column.key && !current.desc }))}>
                          {column.label}{sort.key === column.key && <Icon name="chevron-down" size={13} className={sort.desc ? '' : 'flip'} />}
                        </button>
                      </th>
                    ))}
                    <th className="hide-sm">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, index) => (
                    <tr key={row.id} className={`${selected.has(row.id) ? 'is-selected' : ''}${row.status === 'BAJA' ? ' is-muted' : ''}${canEdit ? ' is-clickable' : ''}`}
                      onClick={canEdit ? () => setEditing(row) : undefined}>
                      <td className="tight" onClick={event => event.stopPropagation()}><Check label={`Seleccionar a ${row.apellido}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /></td>
                      {/* Orden en la lista visible: no depende del ID y se recalcula con cada filtro u orden. */}
                      <td className="num tight muted">{index + 1}</td>
                      <td className="num tight">{row.course_id_seq}</td>
                      <td><span className="cell-main">{row.apellido}, {row.nombre}</span><span className="cell-sub">{row.email_inst || 'Sin email'}</span>{row.legajo && <span className="cell-sub show-sm">Legajo {row.legajo}</span>}</td>
                      <td className="num hide-sm">{row.legajo || '—'}</td>
                      <td>{row.group_no ? <Badge tone="brand">Grupo {row.group_no}</Badge> : <span className="muted">Sin grupo</span>}</td>
                      <td><Badge tone={row.status === 'ALTA' ? 'success' : 'neutral'}>{row.status}</Badge></td>
                      <td className="cell-obs hide-sm">{row.observaciones || <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Async>
      </Card>

      {editing && <StudentForm courseId={courseId} student={editing === 'new' ? null : editing} groups={groups.data ?? []} onClose={() => setEditing(null)} onSaved={refresh} />}
      {importing && <ImportModal courseId={courseId} onClose={() => setImporting(false)} onImported={refresh} />}
    </>
  );
}

function StudentForm({ courseId, student, groups, onClose, onSaved }: { courseId: number; student: Student | null; groups: Group[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const [draft, setDraft] = useState({
    last_name: student?.apellido ?? '', first_name: student?.nombre ?? '', legajo: student?.legajo ?? '', email_inst: student?.email_inst ?? '',
    group_number: student?.group_no ? String(student.group_no) : '', status: student?.status ?? 'ALTA', observaciones: student?.observaciones ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (name: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const payload = { ...draft, course_id: courseId, group_number: draft.group_number ? Number(draft.group_number) : null };
    try {
      if (student) {
        await api.post('/estudiantes/editar', { ...payload, enrollment_id: student.id });
        toast.success('Estudiante actualizado.');
      } else {
        const result = await api.post<{ assigned_id: number }>('/estudiantes/guardar', payload);
        toast.success(`Estudiante agregado con el ID ${result.assigned_id}.`);
      }
      onSaved();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal title={student ? 'Editar estudiante' : 'Nuevo estudiante'} subtitle={student ? `ID ${student.course_id_seq} en el curso` : 'El ID dentro del curso se asigna automáticamente.'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="student-form" busy={busy}>{student ? 'Guardar cambios' : 'Agregar'}</Button></>}>
      <form id="student-form" className="form-grid" onSubmit={submit}>
        {error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{error}</div>}
        <Field label="Apellido"><input className="input" required autoFocus maxLength={80} value={draft.last_name} onChange={set('last_name')} /></Field>
        <Field label="Nombre"><input className="input" required maxLength={80} value={draft.first_name} onChange={set('first_name')} /></Field>
        <Field label="Legajo" hint={`Obligatorio y único, hasta ${LEGAJO_MAX} caracteres.`}><input className="input" required maxLength={LEGAJO_MAX} value={draft.legajo} onChange={set('legajo')} /></Field>
        <Field label="Email institucional"><input className="input" type="email" value={draft.email_inst} onChange={set('email_inst')} /></Field>
        <Field label="Grupo">
          <select className="select" value={draft.group_number} onChange={set('group_number')}>
            <option value="">Sin grupo</option>
            {groups.map(group => <option key={group.id} value={group.number}>{groupLabel(group)}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className="select" value={draft.status} onChange={set('status')}>
            {catalog.enrollment_statuses.map(option => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Observaciones" className="span-2"><textarea className="textarea" rows={3} value={draft.observaciones} onChange={set('observaciones')} /></Field>
      </form>
    </Modal>
  );
}

type ImportResult = { inserted: number; updated: number; errors: string[]; dry_run: boolean };

/** Importación en dos pasos: primero se simula para revisar errores, después se confirma. */
function ImportModal({ courseId, onClose, onImported }: { courseId: number; onClose: () => void; onImported: () => void }) {
  const { toast } = useFeedback();
  const [format, setFormat] = useState<keyof typeof IMPORT_FORMATS>('standard');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api.upload<ImportResult>(`/estudiantes/bulk?course_id=${courseId}&dry_run=${dryRun ? 1 : 0}&format=${format}`, form);
      if (dryRun) setPreview(result);
      else {
        toast.success(`Importación lista: ${plural(result.inserted, 'nuevo', 'nuevos')}, ${plural(result.updated, 'ya existente', 'ya existentes')}${result.errors.length ? `, ${plural(result.errors.length, 'fila con error', 'filas con error')}` : ''}.`);
        onImported();
        onClose();
      }
    } catch (reason) { setError(errorMessage(reason)); }
    setBusy(false);
  };

  return (
    <Modal title="Importar estudiantes" subtitle="Subí la lista del curso desde un archivo CSV." onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        {preview
          ? <Button icon="check" busy={busy} onClick={() => send(false)}>Confirmar importación</Button>
          : <Button icon="search" busy={busy} disabled={!file} onClick={() => send(true)}>Revisar archivo</Button>}
      </>}>
      {error && <div className="form-alert" role="alert"><Icon name="alert" size={16} />{error}</div>}
      <Field label="Formato del archivo">
        <Segmented label="Formato" value={format} onChange={value => { setFormat(value); setPreview(null); }}
          options={Object.entries(IMPORT_FORMATS).map(([value, item]) => ({ value: value as keyof typeof IMPORT_FORMATS, label: item.label }))} />
      </Field>
      <p className="form-note">{IMPORT_FORMATS[format].help}</p>
      <label className={`dropzone${file ? ' has-file' : ''}`}>
        <Icon name={file ? 'check-circle' : 'upload'} size={26} />
        <strong>{file ? file.name : 'Elegí un archivo CSV'}</strong>
        <small>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · clic para cambiarlo` : 'o arrastralo hasta acá'}</small>
        <input type="file" accept=".csv,text/csv" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} />
      </label>
      {preview && (
        <div className="import-preview">
          <p><Icon name="check-circle" size={16} /> El archivo se leyó bien. Al confirmar se cargan las filas válidas; quienes ya estén en el curso no se duplican.</p>
          {preview.errors.length > 0 && (
            <>
              <strong>{plural(preview.errors.length, 'fila no se va a importar', 'filas no se van a importar')}:</strong>
              <ul>{preview.errors.map(item => <li key={item}>{item}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
