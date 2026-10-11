import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Async, Button, Card, EmptyState, Field, Modal, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { invalidate, useApi } from '../lib/query';

export default function PlanningPage() {
  const { course } = useCourse();
  const { can } = useAuth();
  const courseId = course!.id;
  const query = useApi<{ course: { plan_url: string } }>(`/planificacion?course_id=${courseId}`);
  const [editing, setEditing] = useState(false);
  const canEdit = can('planning.edit');
  const url = query.data?.course.plan_url || '';

  return (
    <>
      <PageHeader eyebrow={course!.name} title="Planificación" description="Plan de clases publicado para el curso."
        actions={<>
          {url && <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer"><Icon name="external" size={16} /><span>Abrir en otra pestaña</span></a>}
          {canEdit && <Button variant={url ? 'secondary' : 'primary'} icon="link" onClick={() => setEditing(true)}>{url ? 'Cambiar enlace' : 'Configurar enlace'}</Button>}
        </>} />

      <Async query={query}>
        {() => url ? (
          <Card className="card-flush plan-frame">
            <iframe src={url} title={`Planificación de ${course!.name}`} loading="lazy" />
            <p className="plan-hint"><Icon name="info" size={14} /> Si el documento no se ve acá, es porque el sitio no permite mostrarse embebido: usá “Abrir en otra pestaña”.</p>
          </Card>
        ) : (
          <Card><EmptyState mascot title="Este curso todavía no tiene planificación"
            description={canEdit ? 'Pegá el enlace del documento o calendario con el plan de clases.' : 'El Gurú todavía no cargó el enlace al plan de clases.'}
            action={canEdit ? <Button icon="link" onClick={() => setEditing(true)}>Configurar enlace</Button> : undefined} /></Card>
        )}
      </Async>

      {editing && <PlanForm courseId={courseId} current={url} onClose={() => setEditing(false)} />}
    </>
  );
}

function PlanForm({ courseId, current, onClose }: { courseId: number; current: string; onClose: () => void }) {
  const { toast } = useFeedback();
  const [url, setUrl] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/planificacion/guardar', { course_id: courseId, plan_url: url.trim() });
      toast.success(url.trim() ? 'Enlace de planificación guardado.' : 'Se quitó el enlace de planificación.');
      invalidate(path => path.startsWith('/planificacion') || path.startsWith('/admin/courses'));
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  return (
    <Modal size="sm" title="Enlace de planificación" subtitle="Lo ven todos los docentes del curso." onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="plan-form" busy={busy}>Guardar</Button></>}>
      <form id="plan-form" className="form-stack" onSubmit={submit}>
        {error && <div className="form-alert" role="alert"><Icon name="alert" size={16} />{error}</div>}
        <Field label="URL del plan" hint="Dejalo vacío para quitar la planificación. En Google Docs o Sheets usá el enlace de “Publicar en la web”.">
          <input className="input" type="url" autoFocus placeholder="https://…" value={url} onChange={event => setUrl(event.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
