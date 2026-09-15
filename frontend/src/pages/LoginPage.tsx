import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, session } from '../services/api';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate(); const { refresh } = useApp();
  const submit = async event => { event.preventDefault(); setBusy(true); setError(''); try { const result = await api.login(form); session.token = result.token; await refresh(); navigate('/app/dashboard'); } catch (reason) { setError(reason.message); } finally { setBusy(false); } };
  return <main className="login-page"><section className="login-panel"><div className="brand login-brand"><span>●</span> La PolliWeb</div><p className="eyebrow">Sistema de planificación docente</p><h1>Todo tu curso, en un solo lugar.</h1><p className="muted">Accedé a estudiantes, evaluaciones, seguimiento y planificación con una experiencia de trabajo más clara.</p></section><section className="login-card"><form onSubmit={submit}><h2>Bienvenido</h2><p>Ingresá con tus credenciales institucionales.</p>{error && <div className="form-alert" role="alert">{error}</div>}<label>Usuario<input required autoComplete="username" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label><label>Contraseña<input required type="password" autoComplete="current-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label><Button type="submit" busy={busy}>Ingresar</Button></form></section></main>;
}
