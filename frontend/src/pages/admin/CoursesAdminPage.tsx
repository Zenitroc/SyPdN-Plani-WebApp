import { useEffect, useState, type FormEvent } from 'react';
import { CourseDot } from '../../components/CourseSwitcher';
import { Icon } from '../../components/Icon';
import { Async, Avatar, Badge, Button, Card, EmptyState, Field, IconButton, PageHeader, SearchInput, Switch } from '../../components/ui';
import { useCourse } from '../../context/CourseContext';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { fullName, matches, plural } from '../../lib/format';
import { invalidate, useApi } from '../../lib/query';

type AdminCourse = { id: number; code: string; name: string; term: string | null; is_active: number; plan_url: string };
type Member = { id: number; name: string; username: string; roles: string[] };
type AdminUser = Member & { last_name: string | null };

const blank = { code: '', name: '', term: '', plan_url: '', is_active: true };

export default function CoursesAdminPage() {
  const { courses: colored } = useCourse();
  const list = useApi<AdminCourse[]>('/admin/courses');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | 'new' | null>(null);
  const current = selected === 'new' ? null : list.data?.find(course => Number(course.id) === selected) ?? null;
  const colorOf = (id: number) => colored.find(course => course.id === Number(id))?.color || '';

  return (
    <>
      <PageHeader eyebrow="Administración" title="Cursos" description="Alta y edición de cursos, y qué docentes pueden trabajar en cada uno."
        actions={<Button icon="plus" onClick={() => setSelected('new')}>Nuevo curso</Button>} />

      <div className="split">
        <Card className="card-flush split-list">
          <div className="split-search"><SearchInput value={search} onChange={setSearch} placeholder="Buscar curso…" /></div>
          <Async query={list}>
            {data => {
              const visible = data.filter(course => matches(search, course.name, course.code, course.term));
              return visible.length ? (
                <ul className="pick-list">
                  {visible.map(course => (
                    <li key={course.id}>
                      <button type="button" className={Number(course.id) === selected ? 'is-selected' : ''} onClick={() => setSelected(Number(course.id))}>
                        <CourseDot color={colorOf(course.id)} size={14} />
                        <span className="grow"><strong>{course.name}</strong><small>{[course.code, course.term].filter(Boolean).join(' · ')}</small></span>
                        {!Number(course.is_active) && <Badge tone="warning">Inactivo</Badge>}
                        <Icon name="chevron-right" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="search" title={data.length ? 'Ningún curso coincide' : 'Todavía no hay cursos'} description={data.length ? undefined : 'Creá el primero con “Nuevo curso”.'} />;
            }}
          </Async>
        </Card>

        <div className="split-detail">
          {selected === 'new' || current
            ? <CourseEditor key={current?.id ?? 'new'} course={current} onDone={id => setSelected(id)} />
            : <Card><EmptyState icon="book" title="Elegí un curso" description="Seleccioná uno de la lista para editarlo, o creá uno nuevo." /></Card>}
        </div>
      </div>
    </>
  );
}

function CourseEditor({ course, onDone }: { course: AdminCourse | null; onDone: (id: number | null) => void }) {
  const { toast, confirm } = useFeedback();
  const [draft, setDraft] = useState(course ? { code: course.code, name: course.name, term: course.term ?? '', plan_url: course.plan_url ?? '', is_active: Boolean(Number(course.is_active)) } : blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (name: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { ...draft, is_active: Number(draft.is_active) };
      if (course) {
        await api.post('/admin/courses/update', { ...payload, course_id: course.id });
        toast.success('Curso actualizado.');
        invalidate();
      } else {
        const created = await api.post<{ id: number }>('/admin/courses/create', payload);
        toast.success('Curso creado. Ahora asignale docentes.');
        invalidate();
        onDone(created.id);
      }
    } catch (reason) { setError(errorMessage(reason)); }
    setBusy(false);
  };

  const remove = async () => {
    if (!course) return;
    const accepted = await confirm({
      title: `Eliminar “${course.name}”`, confirmLabel: 'Eliminar curso', requireText: 'ELIMINAR',
      message: 'Se borran el curso y todo lo que contiene: inscripciones, grupos, entregas, notas y asistencias. No se puede deshacer; para ocultarlo, marcalo como inactivo.',
    });
    if (!accepted) return;
    try {
      await api.post('/admin/courses/delete', { course_id: course.id, confirm: 'ELIMINAR' });
      toast.success('Curso eliminado.');
      invalidate();
      onDone(null);
    } catch (reason) { toast.error(reason); }
  };

  return (
    <>
      <Card title={course ? 'Datos del curso' : 'Nuevo curso'} actions={course && <IconButton icon="trash" label="Eliminar curso" className="is-danger" onClick={remove} />}>
        <form className="form-grid" onSubmit={submit}>
          {error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{error}</div>}
          <Field label="Nombre" className="span-2"><input className="input" required autoFocus={!course} maxLength={120} value={draft.name} onChange={set('name')} /></Field>
          <Field label="Código" hint="Único en la plataforma."><input className="input" required maxLength={32} value={draft.code} onChange={set('code')} /></Field>
          <Field label="Comisión / período"><input className="input" maxLength={32} placeholder="Ej.: 2026 · Martes" value={draft.term} onChange={set('term')} /></Field>
          <Field label="Enlace de planificación" className="span-2"><input className="input" type="url" placeholder="https://…" value={draft.plan_url} onChange={set('plan_url')} /></Field>
          <div className="span-2"><Switch label="Curso activo" checked={draft.is_active} onChange={checked => setDraft(current => ({ ...current, is_active: checked }))} /></div>
          <div className="form-actions span-2">
            <Button type="submit" busy={busy}>{course ? 'Guardar cambios' : 'Crear curso'}</Button>
            {!course && <Button variant="ghost" onClick={() => onDone(null)}>Cancelar</Button>}
          </div>
        </form>
      </Card>
      {course && <CourseMembers courseId={Number(course.id)} />}
    </>
  );
}

function CourseMembers({ courseId }: { courseId: number }) {
  const { toast } = useFeedback();
  const key = `/admin/course-users?course_id=${courseId}`;
  const members = useApi<Member[]>(key);
  const users = useApi<AdminUser[]>('/admin/users');
  const [picked, setPicked] = useState('');
  useEffect(() => setPicked(''), [courseId]);

  const change = async (action: 'assign' | 'unassign', userId: number) => {
    try {
      await api.post(`/admin/course-users/${action}`, { course_id: courseId, user_id: userId });
      setPicked('');
      invalidate(path => path.startsWith('/admin/'));
    } catch (reason) { toast.error(reason); }
  };

  const assigned = new Set((members.data ?? []).map(member => Number(member.id)));
  const available = (users.data ?? []).filter(user => !assigned.has(Number(user.id)));

  return (
    <Card title="Docentes asignados" actions={members.data && <Badge>{plural(members.data.length, 'docente', 'docentes')}</Badge>}>
      <div className="assign-row">
        <select className="select" aria-label="Docente a asignar" value={picked} onChange={event => setPicked(event.target.value)}>
          <option value="">Elegí un usuario…</option>
          {available.map(user => <option key={user.id} value={user.id}>{fullName(user) || user.username} (@{user.username})</option>)}
        </select>
        <Button icon="plus" disabled={!picked} onClick={() => change('assign', Number(picked))}>Asignar</Button>
      </div>
      <Async query={members}>
        {data => data.length ? (
          <ul className="people-list">
            {data.map(member => (
              <li key={member.id}>
                <Avatar name={member.name} size={34} />
                <div className="grow"><strong>{member.name}</strong><small>@{member.username}</small></div>
                {member.roles.map(role => <Badge key={role} tone="brand">{role}</Badge>)}
                <IconButton icon="x" label={`Quitar a ${member.name}`} className="is-danger" onClick={() => change('unassign', Number(member.id))} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">Todavía no hay docentes asignados. Los usuarios con rol Gurú ven todos los cursos sin asignación.</p>}
      </Async>
    </Card>
  );
}
