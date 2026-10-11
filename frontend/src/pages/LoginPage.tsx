import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Button, Field, IconButton, Modal } from '../components/ui';
import { takeSessionNotice, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Brand } from '../layouts/AppLayout';
import { errorMessage } from '../lib/api';
import { APP_NAME, SUPPORT_EMAIL } from '../lib/config';

const REMEMBER_KEY = 'spn_remembered_user';

const HIGHLIGHTS = [
  { icon: 'users', title: 'Padrón y grupos', text: 'Importá tu lista del SIU y armá los equipos arrastrando.' },
  { icon: 'exam', title: 'Evaluaciones al día', text: 'TPs, parciales y recuperatorios con cálculo automático.' },
  { icon: 'trend', title: 'Seguimiento', text: 'Alertas e indicadores para saber a quién acompañar.' },
];

// Plantillas de los correos de soporte: asunto y datos que debe enviar la persona.
const HELP = {
  forgot: {
    title: 'Recuperar el acceso',
    intro: 'Para recuperar tu acceso escribinos con estos datos:',
    subject: `Recuperar acceso ${APP_NAME}`,
    fields: ['Usuario', 'Nombre y apellido', 'DNI', 'Curso y comisión'],
  },
  request: {
    title: 'Solicitar una cuenta',
    intro: 'Para pedir tu cuenta escribinos con estos datos y te respondemos con los pasos a seguir:',
    subject: `Solicitud de cuenta ${APP_NAME}`,
    fields: ['Nombre', 'Apellido', 'DNI', 'Email institucional', 'Curso y comisión', 'Observaciones (opcional)'],
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_KEY) || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem(REMEMBER_KEY)));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice] = useState(takeSessionNotice);
  const [help, setHelp] = useState<keyof typeof HELP | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login({ username: username.trim(), password });
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch (reason) {
      setError(errorMessage(reason));
      setBusy(false);
    }
  };

  const topic = help ? HELP[help] : null;

  return (
    <main className="login">
      <section className="login-hero">
        <div className="login-blob login-blob-1" /><div className="login-blob login-blob-2" /><div className="login-blob login-blob-3" />
        <div className="login-hero-content">
          <div className="login-brand"><Brand /></div>
          <p className="login-kicker">Gestión de cursos</p>
          <h1>Todo tu curso,<br />en un solo lugar.</h1>
          <p className="login-lead">Estudiantes, grupos, trabajos prácticos y parciales en una herramienta pensada para el equipo docente.</p>
          <ul className="login-highlights">
            {HIGHLIGHTS.map(item => (
              <li key={item.title}>
                <span><Icon name={item.icon} size={18} /></span>
                <div><strong>{item.title}</strong><small>{item.text}</small></div>
              </li>
            ))}
          </ul>
        </div>
        <img className="login-mascot" src="/assets/img/tutorial/PollitoGuia1.png" alt="" />
      </section>

      <section className="login-panel">
        <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'} className="login-theme" onClick={toggleTheme} />
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-brand"><Brand /></div>
          <div>
            <h2>¡Hola de nuevo!</h2>
            <p className="muted">Ingresá con tu usuario para continuar.</p>
          </div>
          {notice && !error && <div className="form-alert form-success" role="status"><Icon name="info" size={16} />{notice}</div>}
          {error && <div className="form-alert" role="alert" key={error}><Icon name="alert" size={16} />{error}</div>}
          <Field label="Usuario">
            <input className="input" required autoFocus={!username} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} />
          </Field>
          <Field label="Contraseña">
            <div className="password-field">
              <input className="input" required autoFocus={Boolean(username)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
              <IconButton icon={showPassword ? 'eye-off' : 'eye'} label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)} />
            </div>
          </Field>
          <div className="login-row">
            <label className="login-remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Recordar mi usuario</label>
            <button type="button" className="link-btn" onClick={() => setHelp('forgot')}>Olvidé mi contraseña</button>
          </div>
          <Button type="submit" busy={busy} className="login-submit">{busy ? 'Ingresando…' : 'Ingresar'}</Button>
          <p className="login-foot">¿Todavía no tenés cuenta? <button type="button" className="link-btn" onClick={() => setHelp('request')}>Solicitala acá</button></p>
        </form>
      </section>

      {topic && (
        <Modal title={topic.title} size="sm" onClose={() => setHelp(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setHelp(null)}>Cerrar</Button>
            <a className="btn btn-primary" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(topic.subject)}&body=${encodeURIComponent(topic.fields.map(field => `${field}: `).join('\n'))}`}><Icon name="mail" size={16} /><span>Abrir correo</span></a>
          </>}>
          <p className="confirm-body">{topic.intro}</p>
          <div className="form-note">
            <div><b>Para:</b> {SUPPORT_EMAIL}</div>
            <div><b>Asunto:</b> {topic.subject}</div>
            {topic.fields.map(field => <div key={field}><b>{field}:</b> …</div>)}
          </div>
        </Modal>
      )}
    </main>
  );
}
