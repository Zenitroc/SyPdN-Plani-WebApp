import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { Async, Avatar, Badge, Button, Card, EmptyState, Field, IconButton, ImagePicker, Modal, PageHeader, SearchInput } from '../../components/ui';
import { useCatalog } from '../../context/catalog';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { fullName, imageToDataUrl, matches, plural } from '../../lib/format';
import { invalidate, useApi } from '../../lib/query';

type Role = { id: number; code: string; description: string | null };
type AdminUser = { id: number; name: string; last_name: string | null; username: string; email: string; personal_email: string | null; legajo: string | null; phone: string | null; roles: string[]; photo_url: string | null };
type Detail = { user: AdminUser & { must_change_password: number }; courses: { id: number; code: string; name: string; term: string | null }[] };
type CourseOption = { id: number; code: string; name: string; term: string | null };

const PHOTO_SIDE = 320;
const blankUser = { name: '', last_name: '', username: '', email: '', personal_email: '', legajo: '', phone: '', roles: [] as string[], photo_data: null as string | null };
type Draft = typeof blankUser;

export default function UsersAdminPage() {
  const users = useApi<AdminUser[]>('/admin/users');
  const roles = useApi<Role[]>('/admin/roles', { staleMs: 10 * 60_000 });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader eyebrow="Administración" title="Usuarios" description="Cuentas del equipo docente, sus roles y los cursos a los que acceden."
        actions={<Button icon="plus" onClick={() => setCreating(true)}>Nuevo usuario</Button>} />

      <div className="split">
        <Card className="card-flush split-list">
          <div className="split-search"><SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, usuario o email…" /></div>
          <Async query={users}>
            {data => {
              const visible = data.filter(user => matches(search, fullName(user), user.username, user.email));
              return visible.length ? (
                <ul className="pick-list">
                  {visible.map(user => (
                    <li key={user.id}>
                      <button type="button" className={Number(user.id) === selected ? 'is-selected' : ''} onClick={() => setSelected(Number(user.id))}>
                        <Avatar name={fullName(user) || user.username} src={user.photo_url} size={36} />
                        <span className="grow"><strong>{fullName(user) || user.username}</strong><small>@{user.username} · {user.email}</small></span>
                        {user.roles.length ? user.roles.map(role => <Badge key={role} tone="brand">{role}</Badge>) : <Badge tone="warning">Sin rol</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="search" title="Ningún usuario coincide" />;
            }}
          </Async>
        </Card>

        <div className="split-detail">
          {selected
            ? <UserDetail key={selected} userId={selected} roles={roles.data ?? []} onDeleted={() => setSelected(null)} />
            : <Card><EmptyState icon="shield" title="Elegí un usuario" description="Seleccioná uno de la lista para editar su perfil, sus roles y sus cursos." /></Card>}
        </div>
      </div>

      {creating && <CreateUser roles={roles.data ?? []} onClose={() => setCreating(false)} onCreated={id => setSelected(id)} />}
    </>
  );
}

function UserFields({ draft, setDraft, roles, photo }: { draft: Draft; setDraft: (update: (current: Draft) => Draft) => void; roles: Role[]; photo: string | null }) {
  const { toast } = useFeedback();
  const { max_image_bytes } = useCatalog();
  const set = (name: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));
  const toggleRole = (code: string) => setDraft(current => ({ ...current, roles: current.roles.includes(code) ? current.roles.filter(role => role !== code) : [...current.roles, code] }));
  const pick = async (file: File) => {
    try { const data = await imageToDataUrl(file, max_image_bytes, PHOTO_SIDE); setDraft(current => ({ ...current, photo_data: data })); } catch (reason) { toast.error(reason); }
  };

  return (
    <>
      <Field label="Nombre"><input className="input" required maxLength={120} value={draft.name} onChange={set('name')} /></Field>
      <Field label="Apellido"><input className="input" required maxLength={120} value={draft.last_name} onChange={set('last_name')} /></Field>
      <Field label="Usuario"><input className="input" required autoComplete="off" value={draft.username} onChange={set('username')} /></Field>
      <Field label="Email institucional"><input className="input" required type="email" value={draft.email} onChange={set('email')} /></Field>
      <Field label="Email personal"><input className="input" type="email" value={draft.personal_email} onChange={set('personal_email')} /></Field>
      <Field label="Teléfono"><input className="input" type="tel" value={draft.phone} onChange={set('phone')} /></Field>
      <Field label="Legajo"><input className="input" value={draft.legajo} onChange={set('legajo')} /></Field>
      <Field label="Foto"><ImagePicker round label="Subir foto" value={photo} onPick={pick} onClear={() => setDraft(current => ({ ...current, photo_data: '' }))} /></Field>
      <div className="field span-2">
        <span className="field-label">Roles</span>
        <div className="choice-row">
          {roles.map(role => (
            <button key={role.code} type="button" className={`choice${draft.roles.includes(role.code) ? ' is-active' : ''}`} aria-pressed={draft.roles.includes(role.code)} title={role.description ?? undefined} onClick={() => toggleRole(role.code)}>
              {draft.roles.includes(role.code) && <Icon name="check" size={14} />}{role.code}
            </button>
          ))}
        </div>
        <span className="field-hint">{roles.filter(role => draft.roles.includes(role.code)).map(role => `${role.code}: ${role.description}`).join(' · ') || 'Sin roles, el usuario no puede operar ningún módulo.'}</span>
      </div>
    </>
  );
}

function CreateUser({ roles, onClose, onCreated }: { roles: Role[]; onClose: () => void; onCreated: (id: number) => void }) {
  const { toast } = useFeedback();
  const [draft, setDraft] = useState<Draft>(blankUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api.post<{ id: number; email_sent: boolean }>('/admin/users/create', draft);
      toast.success(created.email_sent
        ? 'Usuario creado. Le enviamos un correo con sus datos de acceso.'
        : `Usuario creado, pero no se pudo enviar el correo: avisale que ingresa con “${draft.username}” como usuario y contraseña.`);
      invalidate('/admin/users');
      onCreated(created.id);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal size="lg" title="Nuevo usuario" subtitle="Su contraseña inicial es igual al nombre de usuario; el sistema le pide cambiarla al primer ingreso." onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="user-create" busy={busy}>Crear usuario</Button></>}>
      <form id="user-create" className="form-grid" onSubmit={submit}>
        {error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{error}</div>}
        <UserFields draft={draft} setDraft={setDraft} roles={roles} photo={draft.photo_data} />
      </form>
    </Modal>
  );
}

function UserDetail({ userId, roles, onDeleted }: { userId: number; roles: Role[]; onDeleted: () => void }) {
  const detail = useApi<Detail>(`/admin/user-detail?user_id=${userId}`);
  return <Async query={detail}>{data => <UserEditor detail={data} roles={roles} onDeleted={onDeleted} />}</Async>;
}

function UserEditor({ detail, roles, onDeleted }: { detail: Detail; roles: Role[]; onDeleted: () => void }) {
  const { user: me } = useAuth();
  const { toast, confirm } = useFeedback();
  const { user, courses } = detail;
  const allCourses = useApi<CourseOption[]>('/admin/courses');
  // `photo_data` sin tocar (null) no viaja a la API; '' la borra y un data URL la reemplaza.
  const [draft, setDraft] = useState<Draft>({ name: user.name, last_name: user.last_name ?? '', username: user.username, email: user.email, personal_email: user.personal_email ?? '', legajo: user.legajo ?? '', phone: user.phone ?? '', roles: user.roles, photo_data: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState('');
  const isSelf = Number(me?.id) === Number(user.id);
  const name = fullName(user) || user.username;
  const refresh = () => invalidate(path => path.startsWith('/admin/'));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { photo_data, ...fields } = draft;
      await api.post('/admin/users/update', { ...fields, user_id: user.id, ...(photo_data === null ? {} : { photo_data }) });
      toast.success('Usuario actualizado.');
      refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    setBusy(false);
  };

  const resetPassword = async () => {
    if (!await confirm({ title: 'Resetear contraseña', tone: 'primary', confirmLabel: 'Resetear', message: `La contraseña de ${name} vuelve a ser su nombre de usuario (“${user.username}”) y deberá cambiarla al ingresar.` })) return;
    try {
      await api.post('/admin/users/update', { user_id: user.id, reset_password: true });
      toast.success('Contraseña reseteada.');
      refresh();
    } catch (reason) { toast.error(reason); }
  };

  const remove = async () => {
    if (!await confirm({ title: `Eliminar a ${name}`, confirmLabel: 'Eliminar usuario', requireText: 'ELIMINAR', message: 'La cuenta se borra y pierde el acceso a todos sus cursos. No se puede deshacer.' })) return;
    try {
      await api.post('/admin/users/delete', { user_id: user.id, confirm: 'ELIMINAR' });
      toast.success('Usuario eliminado.');
      refresh();
      onDeleted();
    } catch (reason) { toast.error(reason); }
  };

  const changeCourse = async (action: 'assign' | 'unassign', courseId: number) => {
    try {
      await api.post(`/admin/course-users/${action}`, { course_id: courseId, user_id: user.id });
      setPicked('');
      refresh();
    } catch (reason) { toast.error(reason); }
  };

  const assigned = new Set(courses.map(course => Number(course.id)));
  const available = (allCourses.data ?? []).filter(course => !assigned.has(Number(course.id)));

  return (
    <>
      <Card title="Perfil y permisos" actions={<>
        {Boolean(user.must_change_password) && <Badge tone="warning" icon="key">Debe cambiar su contraseña</Badge>}
        {!isSelf && <IconButton icon="trash" label="Eliminar usuario" className="is-danger" onClick={remove} />}
      </>}>
        <form className="form-grid" onSubmit={submit}>
          {error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{error}</div>}
          <UserFields draft={draft} setDraft={setDraft} roles={roles} photo={draft.photo_data === null ? user.photo_url : draft.photo_data || null} />
          <div className="form-actions span-2">
            <Button type="submit" busy={busy}>Guardar cambios</Button>
            <Button variant="secondary" icon="key" onClick={resetPassword}>Resetear contraseña</Button>
          </div>
        </form>
      </Card>

      <Card title="Cursos asignados" actions={<Badge>{plural(courses.length, 'curso', 'cursos')}</Badge>}>
        <div className="assign-row">
          <select className="select" aria-label="Curso a asignar" value={picked} onChange={event => setPicked(event.target.value)}>
            <option value="">Elegí un curso…</option>
            {available.map(course => <option key={course.id} value={course.id}>{course.name}{course.term ? ` (${course.term})` : ''}</option>)}
          </select>
          <Button icon="plus" disabled={!picked} onClick={() => changeCourse('assign', Number(picked))}>Asignar</Button>
        </div>
        {courses.length ? (
          <ul className="people-list">
            {courses.map(course => (
              <li key={course.id}>
                <span className="empty-icon mini"><Icon name="book" size={16} /></span>
                <div className="grow"><strong>{course.name}</strong><small>{[course.code, course.term].filter(Boolean).join(' · ')}</small></div>
                <IconButton icon="x" label={`Quitar de ${course.name}`} className="is-danger" onClick={() => changeCourse('unassign', Number(course.id))} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">Sin cursos asignados. Los usuarios con rol Gurú ven todos los cursos de todas formas.</p>}
      </Card>
    </>
  );
}
