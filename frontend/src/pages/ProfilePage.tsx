import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Avatar, Badge, Button, Card, Field, PageHeader } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import { fullName, imageToDataUrl } from '../lib/format';
import { invalidate } from '../lib/query';

const MIN_PASSWORD = 8;
const PHOTO_SIDE = 320;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useFeedback();
  const catalog = useCatalog();
  const [contact, setContact] = useState({ personal_email: user?.personal_email ?? '', legajo: user?.legajo ?? '', phone: user?.phone ?? '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', repeat: '' });
  const [busy, setBusy] = useState<'contact' | 'password' | 'photo' | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const mustChange = Boolean(user?.must_change_password);
  const name = fullName(user) || user?.username || '';
  const roleDescription = (code: string) => catalog.roles.find(role => role.code === code)?.description;

  const savePhoto = async (photo: string | null) => {
    setBusy('photo');
    try {
      await api.post('/me/update', { photo_data: photo });
      await refreshUser();
      invalidate('/admin/users');
      toast.success(photo ? 'Foto actualizada.' : 'Foto eliminada.');
    } catch (reason) { toast.error(reason); }
    setBusy(null);
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try { await savePhoto(await imageToDataUrl(file, catalog.max_image_bytes, PHOTO_SIDE)); } catch (reason) { toast.error(reason); }
  };

  const saveContact = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('contact');
    try {
      await api.post('/me/update', contact);
      await refreshUser();
      toast.success('Datos de contacto guardados.');
    } catch (reason) { toast.error(reason); }
    setBusy(null);
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwords.next.length < MIN_PASSWORD) return setPasswordError(`La contraseña nueva debe tener al menos ${MIN_PASSWORD} caracteres.`);
    if (passwords.next !== passwords.repeat) return setPasswordError('La repetición no coincide con la contraseña nueva.');
    if (passwords.next === user?.username) return setPasswordError('La contraseña no puede ser igual a tu usuario.');
    setBusy('password');
    setPasswordError('');
    try {
      await api.post('/me/password', { current_password: passwords.current, new_password: passwords.next });
      setPasswords({ current: '', next: '', repeat: '' });
      await refreshUser();
      toast.success('Contraseña actualizada.');
    } catch (reason) { setPasswordError(errorMessage(reason)); }
    setBusy(null);
  };

  const setPassword = (field: keyof typeof passwords) => (event: React.ChangeEvent<HTMLInputElement>) => setPasswords(current => ({ ...current, [field]: event.target.value }));
  const setField = (field: keyof typeof contact) => (event: React.ChangeEvent<HTMLInputElement>) => setContact(current => ({ ...current, [field]: event.target.value }));

  return (
    <>
      <PageHeader eyebrow="Cuenta" title="Mi perfil" description="Tu foto, tus datos de contacto y tu contraseña." />

      {mustChange && (
        <div className="callout" role="alert">
          <Icon name="key" size={20} />
          <div><strong>Necesitás cambiar tu contraseña para continuar</strong><p>Tu cuenta tiene una contraseña provisoria. Elegí una nueva y vas a poder usar el resto de la plataforma.</p></div>
        </div>
      )}

      <div className="profile-layout">
        <Card className="profile-id">
          <div className="profile-avatar">
            <Avatar name={name} src={user?.photo_url} size={104} />
            <label className="profile-avatar-edit" title="Cambiar foto">
              {busy === 'photo' ? <span className="spinner" /> : <Icon name="image" size={16} />}
              <input type="file" accept="image/*" hidden disabled={busy === 'photo'} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void pickPhoto(file); }} />
            </label>
          </div>
          <h2>{name}</h2>
          <p className="muted">@{user?.username}</p>
          <div className="profile-roles">{user?.roles.map(role => <span key={role} title={roleDescription(role)}><Badge tone="brand" icon="shield">{role}</Badge></span>)}</div>
          <ul className="profile-facts">
            <li><Icon name="mail" size={15} /><span>{user?.email || 'Sin email institucional'}</span></li>
            {user?.roles[0] && roleDescription(user.roles[0]) && <li><Icon name="info" size={15} /><span>{roleDescription(user.roles[0])}</span></li>}
          </ul>
          {user?.photo_url && <Button variant="ghost" size="sm" disabled={busy === 'photo'} onClick={() => savePhoto(null)}>Quitar foto</Button>}
          <p className="field-hint">El nombre, el usuario y el email institucional los administra el Gurú.</p>
        </Card>

        <div className="profile-forms">
          <Card title="Contraseña" className={mustChange ? 'is-highlight' : ''}>
            <form className="form-grid" onSubmit={savePassword}>
              {passwordError && <div className="form-alert span-2" role="alert" key={passwordError}><Icon name="alert" size={16} />{passwordError}</div>}
              <Field label="Contraseña actual" className="span-2" hint={mustChange ? 'Si es tu primer ingreso, es igual a tu nombre de usuario.' : undefined}>
                <input className="input" required type="password" autoComplete="current-password" autoFocus={mustChange} value={passwords.current} onChange={setPassword('current')} />
              </Field>
              <Field label="Contraseña nueva" hint={`Al menos ${MIN_PASSWORD} caracteres.`}><input className="input" required type="password" autoComplete="new-password" minLength={MIN_PASSWORD} value={passwords.next} onChange={setPassword('next')} /></Field>
              <Field label="Repetir contraseña nueva"><input className="input" required type="password" autoComplete="new-password" value={passwords.repeat} onChange={setPassword('repeat')} /></Field>
              <div className="form-actions span-2"><Button type="submit" icon="lock" busy={busy === 'password'}>Cambiar contraseña</Button></div>
            </form>
          </Card>

          <Card title="Datos de contacto">
            <form className="form-grid" onSubmit={saveContact}>
              <Field label="Email personal"><input className="input" type="email" value={contact.personal_email} onChange={setField('personal_email')} /></Field>
              <Field label="Teléfono"><input className="input" type="tel" value={contact.phone} onChange={setField('phone')} /></Field>
              <Field label="Legajo"><input className="input" value={contact.legajo} onChange={setField('legajo')} /></Field>
              <div className="form-actions span-2"><Button type="submit" busy={busy === 'contact'}>Guardar datos</Button></div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
