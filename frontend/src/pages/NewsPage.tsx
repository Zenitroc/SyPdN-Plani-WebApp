import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Async, Button, Card, EmptyState, Field, IconButton, ImagePicker, Modal, PageHeader, Tabs } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { imageToDataUrl } from '../lib/format';
import { invalidate, useApi } from '../lib/query';

type News = { id: number; title: string; preview: string | null; body: string | null; link: string | null; link_label: string | null; image: string | null };
type Resource = { id: number; title: string; description: string | null; url: string; icon_emoji: string | null; icon_image: string | null };
type Config = { news: News[]; resources: Resource[] };
type Tab = 'news' | 'resources' | 'report';

const CONFIG_KEY = '/reportes/config';

export default function NewsPage() {
  const { can } = useAuth();
  const { toast, confirm } = useFeedback();
  const query = useApi<Config>(CONFIG_KEY);
  const [tab, setTab] = useState<Tab>('news');
  const [editingNews, setEditingNews] = useState<News | 'new' | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | 'new' | null>(null);
  const [reading, setReading] = useState<News | null>(null);
  const canEdit = can('news.edit');

  const remove = async (kind: 'news' | 'resources', item: { id: number; title: string }) => {
    if (!await confirm({ title: kind === 'news' ? 'Eliminar novedad' : 'Eliminar recurso', message: `Se elimina “${item.title}” para todos los cursos.`, confirmLabel: 'Eliminar' })) return;
    try {
      await api.post(`/reportes/${kind}/delete`, { id: item.id });
      toast.success('Eliminado.');
      invalidate(CONFIG_KEY);
    } catch (reason) { toast.error(reason); }
  };

  return (
    <>
      <PageHeader eyebrow="General" title="Novedades" description="Comunicaciones y recursos comunes a todos los cursos, y un canal para avisarnos de errores o ideas."
        actions={canEdit && tab !== 'report' && (tab === 'news'
          ? <Button icon="plus" onClick={() => setEditingNews('new')}>Nueva novedad</Button>
          : <Button icon="plus" onClick={() => setEditingResource('new')}>Nuevo recurso</Button>)} />

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { value: 'news', label: 'Novedades', icon: 'megaphone', count: query.data?.news.length },
        { value: 'resources', label: 'Recursos', icon: 'link', count: query.data?.resources.length },
        { value: 'report', label: 'Enviar reporte', icon: 'send' },
      ]} />

      {tab === 'report' ? <ReportForm /> : (
        <Async query={query}>
          {data => tab === 'news' ? (
            data.news.length ? (
              <div className="news-grid">
                {data.news.map((item, index) => (
                  <article key={item.id} className="news-card" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                    {item.image && <img className="news-image" src={item.image} alt="" />}
                    <div className="news-body">
                      <h3>{item.title}</h3>
                      {item.preview && <p>{item.preview}</p>}
                      <div className="news-actions">
                        {item.body && <Button variant="soft" size="sm" onClick={() => setReading(item)}>Leer más</Button>}
                        {item.link && <a className="btn btn-ghost btn-sm" href={item.link} target="_blank" rel="noreferrer"><span>{item.link_label || 'Abrir enlace'}</span><Icon name="external" size={14} /></a>}
                        <span className="toolbar-spacer" />
                        {canEdit && <IconButton icon="edit" label="Editar novedad" onClick={() => setEditingNews(item)} />}
                        {canEdit && <IconButton icon="trash" label="Eliminar novedad" className="is-danger" onClick={() => remove('news', item)} />}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <Card><EmptyState mascot title="No hay novedades publicadas" description={canEdit ? 'Publicá la primera para que la vea todo el equipo docente.' : 'Cuando haya comunicaciones del equipo las vas a ver acá.'} /></Card>
          ) : (
            data.resources.length ? (
              <div className="resource-grid">
                {data.resources.map((item, index) => (
                  <article key={item.id} className="resource-card" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
                    <span className="resource-icon">{item.icon_image ? <img src={item.icon_image} alt="" /> : item.icon_emoji || <Icon name="link" size={22} />}</span>
                    <div className="grow">
                      <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h3>
                      {item.description && <p className="muted">{item.description}</p>}
                    </div>
                    {canEdit && <IconButton icon="edit" label="Editar recurso" onClick={() => setEditingResource(item)} />}
                    {canEdit && <IconButton icon="trash" label="Eliminar recurso" className="is-danger" onClick={() => remove('resources', item)} />}
                    <a className="icon-btn" href={item.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${item.title}`}><Icon name="external" /></a>
                  </article>
                ))}
              </div>
            ) : <Card><EmptyState icon="link" title="No hay recursos cargados" description={canEdit ? 'Sumá enlaces útiles: guías, bibliografía, plantillas.' : 'Los enlaces útiles del equipo van a aparecer acá.'} /></Card>
          )}
        </Async>
      )}

      {reading && (
        <Modal title={reading.title} size="lg" onClose={() => setReading(null)}
          footer={reading.link ? <a className="btn btn-primary" href={reading.link} target="_blank" rel="noreferrer"><span>{reading.link_label || 'Abrir enlace'}</span><Icon name="external" size={15} /></a> : undefined}>
          {reading.image && <img className="news-image is-full" src={reading.image} alt="" />}
          <p className="news-text">{reading.body}</p>
        </Modal>
      )}
      {editingNews && <NewsForm item={editingNews === 'new' ? null : editingNews} onClose={() => setEditingNews(null)} />}
      {editingResource && <ResourceForm item={editingResource === 'new' ? null : editingResource} onClose={() => setEditingResource(null)} />}
    </>
  );
}

/** Estado y envío comunes a los formularios de esta pantalla. */
function useSubmit(action: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await action(); } catch (reason) { setError(errorMessage(reason)); }
    setBusy(false);
  };
  return { busy, error, setError, submit };
}

function useImagePick(onPicked: (dataUrl: string) => void, onError: (message: string) => void) {
  const { max_image_bytes } = useCatalog();
  return async (file: File) => {
    try { onPicked(await imageToDataUrl(file, max_image_bytes)); } catch (reason) { onError(errorMessage(reason)); }
  };
}

function NewsForm({ item, onClose }: { item: News | null; onClose: () => void }) {
  const { toast } = useFeedback();
  const [draft, setDraft] = useState({ title: item?.title ?? '', preview: item?.preview ?? '', body: item?.body ?? '', link: item?.link ?? '', link_label: item?.link_label ?? '', image: item?.image ?? '' });
  const set = (name: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));
  const form = useSubmit(async () => {
    await api.post('/reportes/news/save', { ...draft, id: item?.id });
    toast.success(item ? 'Novedad actualizada.' : 'Novedad publicada.');
    invalidate(CONFIG_KEY);
    onClose();
  });
  const pick = useImagePick(image => setDraft(current => ({ ...current, image })), form.setError);

  return (
    <Modal title={item ? 'Editar novedad' : 'Nueva novedad'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="news-form" busy={form.busy}>{item ? 'Guardar' : 'Publicar'}</Button></>}>
      <form id="news-form" className="form-grid" onSubmit={form.submit}>
        {form.error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{form.error}</div>}
        <Field label="Título" className="span-2"><input className="input" required autoFocus maxLength={180} value={draft.title} onChange={set('title')} /></Field>
        <Field label="Resumen" hint="Se muestra en la tarjeta." className="span-2"><input className="input" value={draft.preview} onChange={set('preview')} /></Field>
        <Field label="Texto completo" hint="Opcional: se abre con “Leer más”." className="span-2"><textarea className="textarea" value={draft.body} onChange={set('body')} /></Field>
        <Field label="Enlace"><input className="input" type="url" placeholder="https://…" value={draft.link} onChange={set('link')} /></Field>
        <Field label="Texto del enlace"><input className="input" maxLength={120} placeholder="Ver detalle" value={draft.link_label} onChange={set('link_label')} /></Field>
        <Field label="Imagen" hint="Opcional. Se ajusta automáticamente al tamaño permitido." className="span-2">
          <ImagePicker label="Subir imagen" value={draft.image || null} onPick={pick} onClear={() => setDraft(current => ({ ...current, image: '' }))} />
        </Field>
      </form>
    </Modal>
  );
}

function ResourceForm({ item, onClose }: { item: Resource | null; onClose: () => void }) {
  const { toast } = useFeedback();
  const [draft, setDraft] = useState({ title: item?.title ?? '', description: item?.description ?? '', url: item?.url ?? '', icon_emoji: item?.icon_emoji ?? '', icon_image: item?.icon_image ?? '' });
  const set = (name: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft(current => ({ ...current, [name]: event.target.value }));
  const form = useSubmit(async () => {
    await api.post('/reportes/resources/save', { ...draft, id: item?.id });
    toast.success(item ? 'Recurso actualizado.' : 'Recurso agregado.');
    invalidate(CONFIG_KEY);
    onClose();
  });
  const pick = useImagePick(icon_image => setDraft(current => ({ ...current, icon_image })), form.setError);

  return (
    <Modal title={item ? 'Editar recurso' : 'Nuevo recurso'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form="resource-form" busy={form.busy}>{item ? 'Guardar' : 'Agregar'}</Button></>}>
      <form id="resource-form" className="form-grid" onSubmit={form.submit}>
        {form.error && <div className="form-alert span-2" role="alert"><Icon name="alert" size={16} />{form.error}</div>}
        <Field label="Nombre" className="span-2"><input className="input" required autoFocus maxLength={180} value={draft.title} onChange={set('title')} /></Field>
        <Field label="URL" className="span-2"><input className="input" required type="url" placeholder="https://…" value={draft.url} onChange={set('url')} /></Field>
        <Field label="Descripción" className="span-2"><input className="input" value={draft.description} onChange={set('description')} /></Field>
        <Field label="Emoji" hint="Se usa si no hay imagen."><input className="input" maxLength={4} placeholder="📘" value={draft.icon_emoji} onChange={set('icon_emoji')} /></Field>
        <Field label="Ícono"><ImagePicker label="Subir ícono" value={draft.icon_image || null} onPick={pick} onClear={() => setDraft(current => ({ ...current, icon_image: '' }))} /></Field>
      </form>
    </Modal>
  );
}

function ReportForm() {
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const types = Object.entries(catalog.report_types);
  const empty = { type: types[0]?.[0] ?? 'otro', message: '', link: '', image: '' };
  const [draft, setDraft] = useState(empty);
  const form = useSubmit(async () => {
    await api.post('/reportes', { ...draft, image: draft.image || null });
    toast.success('¡Gracias! Tu reporte fue enviado.');
    setDraft(empty);
  });
  const pick = useImagePick(image => setDraft(current => ({ ...current, image })), form.setError);

  return (
    <Card className="report-card">
      <form className="form-stack" onSubmit={form.submit}>
        <div>
          <h2>Contanos qué pasó</h2>
          <p className="muted">El reporte se envía por correo al equipo que mantiene la plataforma, con tu nombre y usuario.</p>
        </div>
        {form.error && <div className="form-alert" role="alert"><Icon name="alert" size={16} />{form.error}</div>}
        <Field label="Tipo">
          <div className="choice-row">
            {types.map(([value, label]) => (
              <button key={value} type="button" className={`choice${draft.type === value ? ' is-active' : ''}`} aria-pressed={draft.type === value} onClick={() => setDraft(current => ({ ...current, type: value }))}>{label}</button>
            ))}
          </div>
        </Field>
        <Field label="Mensaje"><textarea className="textarea" required rows={6} placeholder="¿Qué estabas haciendo y qué esperabas que pasara?" value={draft.message} onChange={event => setDraft(current => ({ ...current, message: event.target.value }))} /></Field>
        <Field label="Enlace relacionado" hint="Opcional."><input className="input" type="url" placeholder="https://…" value={draft.link} onChange={event => setDraft(current => ({ ...current, link: event.target.value }))} /></Field>
        <Field label="Captura de pantalla" hint="Opcional. Se ajusta automáticamente al tamaño permitido.">
          <ImagePicker label="Adjuntar imagen" value={draft.image || null} onPick={pick} onClear={() => setDraft(current => ({ ...current, image: '' }))} />
        </Field>
        <div className="form-actions"><Button type="submit" icon="send" busy={form.busy}>Enviar reporte</Button></div>
      </form>
    </Card>
  );
}
