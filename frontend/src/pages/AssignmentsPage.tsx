import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Async, Badge, Button, Card, Check, EmptyState, Field, GradeSelect, IconButton, Menu, MenuItem, Modal, PageHeader, Segmented, ratioTone } from '../components/ui';
import { termLabel, useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { formatDate, plural } from '../lib/format';
import { invalidate, useApi } from '../lib/query';
import { useSavedFlash } from '../lib/useSavedFlash';

type Assignment = { id: number; term: number; type: string; number: number; topic: string; due_date: string | null; name: string; returned: number };
type Group = { id: number; number: number; name: string | null };
type Grade = { assignment_id: number; group_id: number; grade_code: string | null };
type Data = { groups: Group[]; assignments: Assignment[]; grades: Grade[]; grade_options: string[] };

const tag = (assignment: Pick<Assignment, 'type' | 'number'>) => `${assignment.type} ${assignment.number}`;
const OTHER_TOPIC = '__other__';

export default function AssignmentsPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const { toast, confirm } = useFeedback();
  const catalog = useCatalog();
  const courseId = course!.id;
  const key = `/entregas?course_id=${courseId}&term=ALL`;
  const query = useApi<Data>(key);
  const [term, setTerm] = useState('ALL');
  const [editing, setEditing] = useState<Assignment | 'new' | null>(null);
  const { flash, isSaved } = useSavedFlash();
  const canEdit = can('assignments.edit');

  const saveGrade = async (assignment: Assignment, group: Group, code: string | null) => {
    query.setData(data => ({
      ...data,
      grades: [...data.grades.filter(grade => !(Number(grade.assignment_id) === assignment.id && Number(grade.group_id) === group.id)),
        ...(code ? [{ assignment_id: assignment.id, group_id: group.id, grade_code: code }] : [])],
    }));
    try {
      await api.post('/entregas/calificar', { course_id: courseId, assignment_id: assignment.id, group_id: group.id, grade_code: code });
      flash(`${assignment.id}-${group.id}`);
      invalidate(path => path !== key);
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const setReturned = async (assignment: Assignment, returned: boolean) => {
    query.setData(data => ({ ...data, assignments: data.assignments.map(item => (item.id === assignment.id ? { ...item, returned: Number(returned) } : item)) }));
    try {
      await api.post('/entregas/devolver', { course_id: courseId, assignment_id: assignment.id, returned: Number(returned) });
      invalidate(path => path !== key);
    } catch (reason) { toast.error(reason); void query.reload(); }
  };

  const remove = async (assignment: Assignment) => {
    const accepted = await confirm({
      title: `Eliminar ${tag(assignment)}`, confirmLabel: 'Eliminar entrega', requireText: 'ELIMINAR',
      message: `Se borra “${assignment.name}” junto con todas las notas cargadas para esta entrega. No se puede deshacer.`,
    });
    if (!accepted) return;
    try {
      await api.post('/entregas/eliminar', { course_id: courseId, assignment_id: assignment.id, confirm: 'ELIMINAR' });
      toast.success(`${tag(assignment)} eliminada.`);
      invalidate();
    } catch (reason) { toast.error(reason); }
  };

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Trabajos prácticos" description="Entregas por cuatrimestre y nota de cada grupo. Las notas se guardan al elegirlas."
        actions={canEdit && <Button icon="plus" onClick={() => setEditing('new')}>Nueva entrega</Button>} />

      <div className="toolbar">
        <Segmented label="Cuatrimestre" value={term} onChange={setTerm}
          options={[{ value: 'ALL', label: 'Todo el año' }, ...catalog.terms.map(item => ({ value: String(item), label: termLabel(item) }))]} />
      </div>

      <Async query={query}>
        {data => {
          const gradeOf = new Map(data.grades.map(grade => [`${grade.assignment_id}-${grade.group_id}`, grade.grade_code]));
          const terms = catalog.terms.filter(item => term === 'ALL' || String(item) === term);
          if (!data.assignments.length) {
            return <Card><EmptyState mascot title="Todavía no hay entregas" description="Creá el primer trabajo práctico para empezar a cargar las notas de cada grupo."
              action={canEdit ? <Button icon="plus" onClick={() => setEditing('new')}>Nueva entrega</Button> : undefined} /></Card>;
          }
          return terms.map(currentTerm => {
            const assignments = data.assignments.filter(item => Number(item.term) === currentTerm);
            return (
              <Card key={currentTerm} className="card-flush" title={termLabel(currentTerm)} actions={<Badge>{plural(assignments.length, 'entrega', 'entregas')}</Badge>}>
                {!assignments.length ? <EmptyState icon="clipboard" title="Sin entregas en este cuatrimestre" /> : !data.groups.length ? (
                  <EmptyState icon="groups" title="El curso no tiene grupos" description="Las notas de los TPs se cargan por grupo: creá los grupos primero." />
                ) : (
                  <div className="table-wrap">
                    <table className="table table-compact matrix">
                      <thead>
                        <tr>
                          <th className="sticky-col sticky-end" style={{ left: 0 }}>Grupo</th>
                          <th className="center">Aprobación</th>
                          {assignments.map(assignment => (
                            <th key={assignment.id} className="matrix-head">
                              <div className="matrix-head-top">
                                <strong>{tag(assignment)}</strong>
                                <Badge tone="brand">{assignment.topic}</Badge>
                                {canEdit && (
                                  <Menu trigger={props => <IconButton icon="more" size={15} label={`Opciones de ${tag(assignment)}`} {...props} />}>
                                    {close => (
                                      <>
                                        <MenuItem icon="edit" onClick={() => { close(); setEditing(assignment); }}>Editar</MenuItem>
                                        <MenuItem icon="trash" tone="danger" onClick={() => { close(); void remove(assignment); }}>Eliminar</MenuItem>
                                      </>
                                    )}
                                  </Menu>
                                )}
                              </div>
                              <span className="matrix-name" title={assignment.name}>{assignment.name}</span>
                              <span className="matrix-meta"><Icon name="calendar" size={12} />{formatDate(assignment.due_date, true)}</span>
                              <label className="matrix-returned">
                                <Check tone="success" label={`${tag(assignment)} devuelta`} checked={Boolean(Number(assignment.returned))} onChange={checked => setReturned(assignment, checked)} />
                                Devuelta
                              </label>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.groups.map(group => {
                          const codes = assignments.map(assignment => gradeOf.get(`${assignment.id}-${group.id}`)).filter(Boolean) as string[];
                          const ratio = codes.length ? Math.round((codes.filter(catalog.passes).length * 100) / codes.length) : null;
                          return (
                            <tr key={group.id}>
                              <td className="sticky-col sticky-end" style={{ left: 0 }}><span className="cell-main">Grupo {group.number}</span>{group.name && <span className="cell-sub">{group.name}</span>}</td>
                              <td className="center">{ratio == null ? <span className="muted">—</span> : <Badge tone={ratioTone(ratio, catalog.tp_approval_threshold)}>{ratio}%</Badge>}</td>
                              {assignments.map(assignment => {
                                const code = gradeOf.get(`${assignment.id}-${group.id}`) ?? null;
                                return (
                                  <td key={assignment.id} className={isSaved(`${assignment.id}-${group.id}`) ? 'is-saved' : ''}>
                                    <GradeSelect label={`${tag(assignment)}, grupo ${group.number}`} value={code} tone={catalog.gradeTone(code)} options={data.grade_options} onChange={value => saveGrade(assignment, group, value)} />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          });
        }}
      </Async>

      {editing && <AssignmentForm courseId={courseId} assignment={editing === 'new' ? null : editing} defaultTerm={term === 'ALL' ? catalog.terms[0] : Number(term)} onClose={() => setEditing(null)} />}
    </>
  );
}

function AssignmentForm({ courseId, assignment, defaultTerm, onClose }: { courseId: number; assignment: Assignment | null; defaultTerm: number; onClose: () => void }) {
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const [draft, setDraft] = useState({
    type: assignment?.type ?? catalog.assignments.types[0], term: String(assignment?.term ?? defaultTerm), topic: assignment?.topic ?? catalog.assignments.topics[0],
    due_date: assignment?.due_date ?? '', name: assignment?.name ?? '',
  });
  // "Otro…" despliega un campo para escribir un tema que no está en la lista.
  const [customTopic, setCustomTopic] = useState(Boolean(assignment) && !catalog.assignments.topics.includes(assignment!.topic));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = useApi<{ next: number }>(assignment ? null : `/entregas/next-number?course_id=${courseId}&type=${draft.type}&term=${draft.term}`, { staleMs: 0 });
  const set = (name: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (assignment) {
        await api.post('/entregas/editar', { course_id: courseId, assignment_id: assignment.id, name: draft.name.trim(), due_date: draft.due_date, topic: draft.topic.trim() });
        toast.success(`${tag(assignment)} actualizada.`);
      } else {
        const result = await api.post<{ assignment: Assignment }>('/entregas/crear', { course_id: courseId, ...draft, term: Number(draft.term), name: draft.name.trim() });
        toast.success(`${tag(result.assignment)} creada.`);
      }
      invalidate();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal title={assignment ? `Editar ${tag(assignment)}` : 'Nueva entrega'}
      subtitle={assignment ? termLabel(assignment.term) : next.data ? `Se va a crear como ${draft.type} ${next.data.next}.` : 'El número se asigna automáticamente según el tipo.'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="assignment-form" busy={busy}>{assignment ? 'Guardar cambios' : 'Crear entrega'}</Button></>}>
      <form id="assignment-form" className="form-grid" onSubmit={submit}>
        {error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{error}</div>}
        {!assignment && (
          <>
            <Field label="Tipo"><select className="select" value={draft.type} onChange={set('type')}>{catalog.assignments.types.map(option => <option key={option}>{option}</option>)}</select></Field>
            <Field label="Cuatrimestre"><select className="select" value={draft.term} onChange={set('term')}>{catalog.terms.map(option => <option key={option} value={option}>{termLabel(option)}</option>)}</select></Field>
          </>
        )}
        <Field label="Tema">
          <select className="select" value={customTopic ? OTHER_TOPIC : draft.topic}
            onChange={event => { const other = event.target.value === OTHER_TOPIC; setCustomTopic(other); setDraft(current => ({ ...current, topic: other ? '' : event.target.value })); }}>
            {catalog.assignments.topics.map(option => <option key={option}>{option}</option>)}
            <option value={OTHER_TOPIC}>Otro…</option>
          </select>
        </Field>
        <Field label="Fecha de entrega" hint="Opcional."><input className="input" type="date" value={draft.due_date} onChange={set('due_date')} /></Field>
        {customTopic && (
          <Field label="¿Qué tema?" className="span-2" hint={`Hasta ${catalog.assignments.custom_topic_max_length} caracteres: letras, números, espacios y - _ +. Se guarda en mayúsculas.`}>
            <input className="input" required autoFocus maxLength={catalog.assignments.custom_topic_max_length} pattern="[A-Za-z0-9][A-Za-z0-9 _+\-]*" placeholder="Ej.: BPMN"
              value={draft.topic} onChange={event => setDraft(current => ({ ...current, topic: event.target.value.toUpperCase() }))} />
          </Field>
        )}
        <Field label="Nombre o consigna" className="span-2"><input className="input" required autoFocus maxLength={255} value={draft.name} onChange={set('name')} placeholder="Ej.: Relevamiento de procesos" /></Field>
      </form>
    </Modal>
  );
}
