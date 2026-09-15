import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Button, Card } from '../components/ui';

export function ProfilePage() {
  const { user, refresh } = useApp(); const [draft, setDraft] = useState({ personal_email: user?.personal_email || '', legajo: user?.legajo || '', phone: user?.phone || '' }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setMessage(''); try { await api.post('/me/update', draft); await refresh(); setMessage('Perfil actualizado correctamente.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.'); } finally { setBusy(false); } };
  return <div className="page-stack"><header className="page-heading"><div><p className="eyebrow">Configuración</p><h2>Mi perfil</h2><p className="muted">Actualizá únicamente la información disponible en PolliWeb.</p></div></header><Card className="profile-card"><div className="profile-identity"><span>{user?.name?.slice(0, 1) || 'U'}</span><div><h3>{user?.name}</h3><p>{user?.username}</p><small>{user?.email}</small></div></div><form className="form-stack" onSubmit={save}><div className="form-grid"><label>Email personal<input type="email" value={draft.personal_email} onChange={event => setDraft({ ...draft, personal_email: event.target.value })} /></label><label>Legajo<input value={draft.legajo} onChange={event => setDraft({ ...draft, legajo: event.target.value })} /></label><label>Teléfono<input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></label><label>Roles<input disabled value={user?.roles?.join(', ') || ''} /></label></div><div className="form-actions"><Button busy={busy}>Guardar cambios</Button>{message && <span className="form-feedback">{message}</span>}</div></form></Card></div>;
}
