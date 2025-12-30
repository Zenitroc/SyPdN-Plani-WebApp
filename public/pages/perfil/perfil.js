renderMenu();

function qs(id){ return document.getElementById(id); }

let currentPhotoData = null;

function escapeHtml(s){
  return (s || '').toString().replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

function initialsFrom(name, username){
  const base = (name || '').trim();
  if (base) return base.split(/\s+/).slice(0,2).map(p => p[0]?.toUpperCase() || '').join('');
  return (username || '').slice(0,2).toUpperCase();
}

function setAvatar(photoUrl, name, username){
  const el = qs('profileAvatar');
  if (!el) return;
  if (photoUrl) {
    el.classList.remove('profile-avatar--fallback');
    el.innerHTML = `<img src="${photoUrl}" alt="Foto de ${escapeHtml(name)}" class="profile-avatar" />`;
  } else {
    el.classList.add('profile-avatar--fallback');
    el.textContent = initialsFrom(name, username) || '?';
  }
}

function bindPasswordToggle(inputId, buttonId){
  const input = qs(inputId);
  const toggle = qs(buttonId);
  if (!input || !toggle) return;
  const show = () => { input.type = 'text'; };
  const hide = () => { input.type = 'password'; };
  toggle.addEventListener('mousedown', show);
  toggle.addEventListener('mouseup', hide);
  toggle.addEventListener('mouseleave', hide);
  toggle.addEventListener('touchstart', show, { passive: true });
  toggle.addEventListener('touchend', hide);
}


async function loadProfile(){
  if (!api.getToken()) { location.href = BASE_APP + '/public/pages/login/'; return; }
  const me = await api.get('/me');
  const fullName = `${me.name || ''}${me.last_name ? ' ' + me.last_name : ''}`.trim();
  qs('profileName').textContent = fullName || me.username || '';
  qs('profileInstitutional').textContent = me.email ? `Email institucional: ${me.email}` : '';
  const roles = Array.isArray(me.roles) ? me.roles : [];
  qs('profileRoles').innerHTML = roles.map(r => `<span class="pill">${escapeHtml(r)}</span>`).join('');
  qs('personalEmail').value = me.personal_email || '';
  qs('legajo').value = me.legajo || '';
  qs('phone').value = me.phone || '';
  currentPhotoData = me.photo_url || null;
  setAvatar(currentPhotoData, fullName, me.username);

  if (me.must_change_password) {
    const notice = qs('profileNotice');
    notice.style.display = 'block';
    notice.textContent = 'Por seguridad, necesitás cambiar tu contraseña ahora.';
  }
}

function bindPhotoInput(){
  const input = qs('photoInput');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      alert('La foto supera el límite de 200KB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      currentPhotoData = reader.result;
      setAvatar(currentPhotoData, qs('profileName').textContent, '');
    };
    reader.readAsDataURL(file);
  });
}

async function saveProfile(){
  const msg = qs('profileMsg');
  msg.textContent = '';
  const payload = {
    personal_email: qs('personalEmail').value.trim(),
    legajo: qs('legajo').value.trim(),
    phone: qs('phone').value.trim(),
    photo_data: currentPhotoData,
  };
  try {
    await api.post('/me/update', payload);
    msg.textContent = 'Datos actualizados.';
    await loadProfile();
  } catch (e) {
    msg.textContent = e.message || 'No se pudo actualizar.';
  }
}

async function savePassword(){
  const msg = qs('passwordMsg');
  msg.textContent = '';
  const current = qs('currentPassword').value;
  const next = qs('newPassword').value;
  const confirm = qs('confirmPassword').value;
  if (!current || !next || !confirm) {
    msg.textContent = 'Completá los tres campos.';
    return;
  }
  if (next !== confirm) {
    msg.textContent = 'La nueva contraseña no coincide.';
    return;
  }
  try {
    await api.post('/me/password', { current_password: current, new_password: next });
    msg.textContent = 'Contraseña actualizada.';
    qs('currentPassword').value = '';
    qs('newPassword').value = '';
    qs('confirmPassword').value = '';
    await loadProfile();
  } catch (e) {
    msg.textContent = e.message || 'No se pudo actualizar la contraseña.';
  }
}

(async function init(){
  await loadProfile();
  bindPhotoInput();
  bindPasswordToggle('currentPassword', 'toggleCurrentPassword');
  bindPasswordToggle('newPassword', 'toggleNewPassword');
  bindPasswordToggle('confirmPassword', 'toggleConfirmPassword');
  qs('btnSaveProfile').addEventListener('click', saveProfile);
  qs('btnSavePassword').addEventListener('click', savePassword);
  qs('btnRemovePhoto').addEventListener('click', () => {
    currentPhotoData = null;
    qs('photoInput').value = '';
    setAvatar(null, qs('profileName').textContent, '');
  });
})();