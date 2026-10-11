import { useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Async, Badge, Button, Card, EmptyState, Field, IconButton, Menu, MenuItem, Modal, PageHeader, Switch, cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { plural } from '../lib/format';
import { invalidate, useApi } from '../lib/query';
import { groupLabel, type Student } from './StudentsPage';

type Group = { id: number; number: number; name: string | null; conformity_submitted: number; conformity_url: string | null };
const DRAG_TYPE = 'application/x-polliweb-enrollment';
const MAX_BATCH = 20;

export default function GroupsPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast, confirm } = useFeedback();
  const courseId = course!.id;
  const studentsKey = `/estudiantes?course_id=${courseId}`;
  const groups = useApi<Group[]>(`/grupos?course_id=${courseId}`);
  const students = useApi<Student[]>(studentsKey);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dropTarget, setDropTarget] = useState<number | 'none' | null>(null);
  const [editing, setEditing] = useState<Group | 'new' | null>(null);
  const canEdit = can('groups.edit');
  const canConform = can('groups.conformity');

  const byGroup = useMemo(() => {
    const map = new Map<number | null, Student[]>();
    // Solo se arman grupos con estudiantes en ALTA: quien se dio de baja no aparece.
    for (const student of (students.data ?? []).filter(row => row.status === 'ALTA').sort((a, b) => `${a.apellido}${a.nombre}`.localeCompare(`${b.apellido}${b.nombre}`, 'es'))) {
      const key = student.group_no ?? null;
      map.set(key, [...(map.get(key) ?? []), student]);
    }
    return map;
  }, [students.data]);
  const ungrouped = byGroup.get(null) ?? [];
  const list = groups.data ?? [];
  const pending = list.filter(group => !Number(group.conformity_submitted)).length;

  const toggle = (id: number) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });

  /** Mueve estudiantes de inmediato en pantalla y confirma con la API; si falla, se recarga lo real. */
  const move = async (ids: number[], groupNumber: number | null) => {
    if (!ids.length) return;
    students.setData(rows => rows.map(row => (ids.includes(row.id) ? { ...row, group_no: groupNumber } : row)));
    setSelected(new Set());
    try {
      await api.post('/grupos/asignar', { course_id: courseId, group_number: groupNumber, enrollment_ids: ids });
      toast.success(`${plural(ids.length, 'estudiante', 'estudiantes')} ${groupNumber ? `en el grupo ${groupNumber}` : 'sin grupo'}.`);
    } catch (reason) { toast.error(reason); }
    invalidate();
  };

  const setConformity = async (group: Group, submitted: boolean) => {
    groups.setData(rows => rows.map(row => (row.id === group.id ? { ...row, conformity_submitted: Number(submitted) } : row)));
    try {
      await api.post('/grupos/editar', { course_id: courseId, group_number: group.number, conformity_submitted: Number(submitted) });
    } catch (reason) { toast.error(reason); void groups.reload(); }
  };

  const remove = async (group: Group) => {
    const members = byGroup.get(group.number)?.length ?? 0;
    const accepted = await confirm({
      title: `Eliminar el grupo ${group.number}`, confirmLabel: 'Eliminar grupo',
      message: `${members ? `Sus ${plural(members, 'integrante queda', 'integrantes quedan')} sin grupo. ` : ''}También se borran las notas de TPs cargadas para este grupo.`,
    });
    if (!accepted) return;
    try {
      await api.post('/grupos/eliminar', { course_id: courseId, group_number: group.number });
      toast.success(`Grupo ${group.number} eliminado.`);
      invalidate();
    } catch (reason) { toast.error(reason); }
  };

  const dropProps = (target: number | 'none') => canEdit ? {
    onDragOver: (event: DragEvent) => { if (event.dataTransfer.types.includes(DRAG_TYPE)) { event.preventDefault(); setDropTarget(target); } },
    onDragLeave: (event: DragEvent) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null); },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(null);
      const dragged = Number(event.dataTransfer.getData(DRAG_TYPE));
      // Si se arrastra uno de los seleccionados, se mueve toda la selección.
      const ids = selected.has(dragged) ? [...selected] : [dragged];
      const destination = target === 'none' ? null : target;
      void move(ids.filter(id => (students.data ?? []).find(row => row.id === id)?.group_no !== destination), destination);
    },
  } : {};

  const member = (student: Student) => (
    <button key={student.id} type="button" className={cx('member', selected.has(student.id) && 'is-selected')}
      draggable={canEdit} aria-pressed={canEdit ? selected.has(student.id) : undefined} disabled={!canEdit}
      onDragStart={event => { event.dataTransfer.setData(DRAG_TYPE, String(student.id)); event.dataTransfer.effectAllowed = 'move'; }}
      onClick={() => toggle(student.id)} title={canEdit ? 'Clic para seleccionar · arrastrá para mover' : undefined}>
      {canEdit && <Icon name="drag" size={13} />}
      <span>{student.apellido}, {student.nombre}</span>
      <small>#{student.course_id_seq}</small>
    </button>
  );

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Grupos" description="Equipos de trabajo del curso y estado de su conformidad."
        actions={canEdit && <Button icon="plus" onClick={() => setEditing('new')}>Nuevo grupo</Button>} />

      <div className="toolbar">
        <Badge tone="brand">{plural(list.length, 'grupo', 'grupos')}</Badge>
        <Badge tone={ungrouped.length ? 'warning' : 'success'}>{ungrouped.length ? `${plural(ungrouped.length, 'estudiante', 'estudiantes')} sin grupo` : 'Todos tienen grupo'}</Badge>
        {list.length > 0 && <Badge tone={pending ? 'danger' : 'success'}>{pending ? `${plural(pending, 'conformidad pendiente', 'conformidades pendientes')}` : 'Conformidades al día'}</Badge>}
      </div>

      {selected.size > 0 && (
        <div className="selection-bar" role="region" aria-label="Acciones sobre la selección">
          <strong>{plural(selected.size, 'seleccionado', 'seleccionados')}</strong>
          <select className="select select-sm select-inline" aria-label="Mover a un grupo" value=""
            onChange={event => { if (event.target.value) void move([...selected], event.target.value === 'none' ? null : Number(event.target.value)); }}>
            <option value="">Mover a…</option>
            {list.map(group => <option key={group.id} value={group.number}>{groupLabel(group)}</option>)}
            <option value="none">Sin grupo</option>
          </select>
          <span className="toolbar-spacer" />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Deseleccionar</Button>
        </div>
      )}

      <Async query={groups}>
        {() => (
          <div className="groups-layout">
            <Card className={cx('ungrouped', dropTarget === 'none' && 'is-drop')} title={<>Sin grupo <span className="tab-count">{ungrouped.length}</span></>}>
              <div className="member-list" {...dropProps('none')}>
                {ungrouped.length ? ungrouped.map(member) : <p className="muted">Todos los estudiantes tienen grupo.</p>}
              </div>
              {canEdit && ungrouped.length > 0 && <p className="field-hint">Arrastralos a un grupo, o marcalos y usá “Mover a…”.</p>}
            </Card>

            {list.length ? (
              <div className="group-grid">
                {list.map((group, index) => {
                  const members = byGroup.get(group.number) ?? [];
                  const conform = Boolean(Number(group.conformity_submitted));
                  return (
                    <article key={group.id} className={cx('group-card', conform ? 'is-ok' : 'is-pending', dropTarget === group.number && 'is-drop')}
                      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }} {...dropProps(group.number)}>
                      <header>
                        <span className="group-number">{group.number}</span>
                        <div className="grow">
                          <h3>{group.name || `Grupo ${group.number}`}</h3>
                          <small className="muted">{plural(members.length, 'integrante', 'integrantes')}</small>
                        </div>
                        {(canEdit || group.conformity_url) && (
                          <Menu trigger={props => <IconButton icon="more" label={`Opciones del grupo ${group.number}`} {...props} />}>
                            {close => (
                              <>
                                {group.conformity_url && <MenuItem icon="external" onClick={() => { close(); window.open(group.conformity_url as string, '_blank', 'noopener'); }}>Ver conformidad</MenuItem>}
                                {canEdit && <MenuItem icon="edit" onClick={() => { close(); setEditing(group); }}>Editar</MenuItem>}
                                {canEdit && <MenuItem icon="trash" tone="danger" onClick={() => { close(); void remove(group); }}>Eliminar</MenuItem>}
                              </>
                            )}
                          </Menu>
                        )}
                      </header>
                      <div className="member-list">
                        {members.length ? members.map(member) : <p className="muted">{canEdit ? 'Soltá estudiantes acá.' : 'Sin integrantes.'}</p>}
                      </div>
                      <footer>
                        <Switch label={conform ? 'Conformidad entregada' : 'Conformidad pendiente'} checked={conform} disabled={!canConform} onChange={checked => setConformity(group, checked)} />
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Card><EmptyState mascot title="Todavía no hay grupos" description="Creá los grupos del curso y repartí a los estudiantes."
                action={canEdit ? <Button icon="plus" onClick={() => setEditing('new')}>Crear el primer grupo</Button> : undefined} /></Card>
            )}
          </div>
        )}
      </Async>

      {editing && <GroupForm courseId={courseId} group={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function GroupForm({ courseId, group, onClose }: { courseId: number; group: Group | null; onClose: () => void }) {
  const { toast } = useFeedback();
  const [name, setName] = useState(group?.name ?? '');
  const [url, setUrl] = useState(group?.conformity_url ?? '');
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (group) {
        await api.post('/grupos/editar', { course_id: courseId, group_number: group.number, name: name.trim() || null, conformity_url: url.trim() || null });
        toast.success(`Grupo ${group.number} actualizado.`);
      } else {
        const result = await api.post<{ numbers: number[] }>('/grupos/crear', { course_id: courseId, name: name.trim() || null, count });
        toast.success(result.numbers.length > 1 ? `Grupos ${result.numbers[0]} a ${result.numbers[result.numbers.length - 1]} creados.` : `Grupo ${result.numbers[0]} creado.`);
      }
      invalidate();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal size="sm" title={group ? `Editar grupo ${group.number}` : 'Nuevo grupo'} subtitle={group ? undefined : 'El número se asigna a continuación del último.'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="group-form" busy={busy}>{group ? 'Guardar' : 'Crear'}</Button></>}>
      <form id="group-form" className="form-stack" onSubmit={submit}>
        {error && <div className="form-alert" role="alert"><Icon name="alert" size={16} />{error}</div>}
        <Field label="Nombre" hint="Opcional."><input className="input" autoFocus maxLength={120} value={name} onChange={event => setName(event.target.value)} /></Field>
        {group
          ? <Field label="Enlace a la conformidad" hint="Opcional: documento o carpeta donde está la conformidad firmada."><input className="input" type="url" placeholder="https://…" value={url} onChange={event => setUrl(event.target.value)} /></Field>
          : <Field label="Cantidad de grupos a crear" hint={count > 1 ? 'El nombre se aplica solo al primero.' : undefined}><input className="input" type="number" min={1} max={MAX_BATCH} value={count} onChange={event => setCount(Math.max(1, Math.min(MAX_BATCH, Number(event.target.value) || 1)))} /></Field>}
      </form>
    </Modal>
  );
}
