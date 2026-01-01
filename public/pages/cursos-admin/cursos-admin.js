renderMenu();

function qs(id){ return document.getElementById(id); }

let COURSES = [];
let USERS = [];
let ASSIGNED = [];
let SELECTED_ID = null;
let SELECTED_ACTIVE = null;

function setMessage(id, msg){ qs(id).textContent = msg || ''; }

function courseById(id){ return COURSES.find(c => Number(c.id) === Number(id)); }

function getFilteredCourses(){
  const query = (qs('courseFilter')?.value || '').trim().toLowerCase();
  if (!query) return COURSES;
  return COURSES.filter(c => {
    const hay = [c.code, c.name, c.term].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(query);
  });
}

function renderCourses(){
  const el = qs('coursesTable');
  const filtered = getFilteredCourses();
  if (!filtered.length) {
    const hasFilter = (qs('courseFilter')?.value || '').trim().length > 0;
    el.innerHTML = `<div class="card">${hasFilter ? 'No hay cursos que coincidan.' : 'No hay cursos cargados.'}</div>`;
    return;
  }
  const rows = filtered.map(c => {
    const active = Number(c.is_active) === 1;
    const selected = Number(c.id) === Number(SELECTED_ID) ? 'style="background:color-mix(in oklab, var(--primary) 10%, var(--surface))"' : '';
    return `
      <tr ${selected}>
        <td>${c.code ?? ''}</td>
        <td>${c.name ?? ''}</td>
        <td>${c.term ?? ''}</td>
        <td><span class="pill ${active ? 'on' : 'off'}">${active ? 'Activo' : 'Inactivo'}</span></td>
        <td><button class="btn btn-ghost" data-edit="${c.id}">Editar</button></td>
      </tr>`;
  }).join('');
  el.innerHTML = `
    <table class="tbl">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Comisión</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  Array.from(document.querySelectorAll('[data-edit]')).forEach(btn => {
    btn.addEventListener('click', () => {
      SELECTED_ID = Number(btn.dataset.edit);
      applySelection();
      qs('editForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function applySelection(){
  const course = courseById(SELECTED_ID);
  if (!course) {
    qs('editEmpty').style.display = 'block';
    qs('editForm').style.display = 'none';
    qs('assignEmpty').style.display = 'block';
    qs('assignPanel').style.display = 'none';
    return;
  }
  qs('editEmpty').style.display = 'none';
  qs('editForm').style.display = 'block';
  qs('assignEmpty').style.display = 'none';
  qs('assignPanel').style.display = 'block';

  SELECTED_ACTIVE = Number(course.is_active) === 1;
  qs('editCode').value = course.code ?? '';
  qs('editName').value = course.name ?? '';
  qs('editTerm').value = course.term ?? '';
  qs('editPlanUrl').value = course.plan_url ?? '';
  updateStatusBadge();

  loadAssigned();
}

function renderAssignOptions(){
  const select = qs('assignUser');
  const assignedIds = new Set(ASSIGNED.map(u => Number(u.id)));
  const available = USERS.filter(u => !assignedIds.has(Number(u.id)));
  if (!available.length) {
    select.innerHTML = '<option value="">Sin usuarios disponibles</option>';
    return;
  }
  select.innerHTML = '<option value="">Seleccioná un usuario</option>' +
    available.map(u => `<option value="${u.id}">${u.name} (${u.username})</option>`).join('');
}

function renderAssignedList(){
  const el = qs('assignedList');
  if (!ASSIGNED.length) {
    el.innerHTML = '<div class="muted">No hay usuarios asignados.</div>';
    return;
  }
  const roleLabel = (u) => {
    if (u.role) return u.role;
    if (Array.isArray(u.roles) && u.roles.length) return u.roles.join(', ');
    if (u.rol) return u.rol;
    return 'Sin rol';
  };
  el.innerHTML = ASSIGNED.map(u => `
    <div class="row-between">
      <div>
        <div>${u.name} <span class="muted">(${u.username})</span></div>
        <div class="muted" style="font-size:.85rem">Rol: ${roleLabel(u)}</div>
      </div>
      <button class="btn btn-ghost" data-unassign="${u.id}">Quitar</button>
    </div>`).join('');

  Array.from(el.querySelectorAll('[data-unassign]')).forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = Number(btn.dataset.unassign);
      await api.post('/admin/course-users/unassign', { course_id: SELECTED_ID, user_id: userId });
      await loadAssigned();
    });
  });
}

function updateStatusBadge() {
  const status = qs('editStatus');
  const btn = qs('btnToggleActive');
  if (!status || !btn) return;
  const active = Boolean(SELECTED_ACTIVE);
  status.textContent = active ? 'Activo' : 'Inactivo';
  status.className = `pill ${active ? 'on' : 'off'}`;
  btn.textContent = active ? 'Desactivar' : 'Activar';
}

async function loadCourses(){
  COURSES = await api.get('/admin/courses');
  if (SELECTED_ID && !courseById(SELECTED_ID)) SELECTED_ID = null;
  renderCourses();
  applySelection();
}

async function loadUsers(){
  USERS = await api.get('/admin/users');
  renderAssignOptions();
}

async function loadAssigned(){
  if (!SELECTED_ID) return;
  ASSIGNED = await api.get(`/admin/course-users?course_id=${SELECTED_ID}`);
  renderAssignOptions();
  renderAssignedList();
}

(async function init(){
  if (!api.getToken()) { location.href = BASE_APP + '/pages/home/'; return; }
  const me = await api.get('/me');
  if (!Array.isArray(me.roles) || !me.roles.includes('GURU')) {
    qs('accessMsg').style.display = 'block';
    qs('accessMsg').textContent = 'Solo el rol GURÚ puede administrar cursos.';
    return;
  }

  qs('adminPanel').style.display = 'block';

  await loadCourses();
  await loadUsers();

  qs('btnRefresh').addEventListener('click', async () => {
    setMessage('createMsg', '');
    setMessage('editMsg', '');
    setMessage('assignMsg', '');
    await loadCourses();
    await loadUsers();
    await loadAssigned();
  });

  qs('btnCreate').addEventListener('click', async () => {
    setMessage('createMsg', '');
    const payload = {
      code: qs('newCode').value.trim(),
      name: qs('newName').value.trim(),
      term: qs('newTerm').value.trim(),
      plan_url: qs('newPlanUrl').value.trim(),
      is_active: 1,
    };
    try {
      const res = await api.post('/admin/courses/create', payload);
      setMessage('createMsg', `Curso creado (ID ${res.id}).`);
      qs('newCode').value = '';
      qs('newName').value = '';
      qs('newTerm').value = '';
      qs('newPlanUrl').value = '';
      closeCreateModal();
      await loadCourses();
    } catch (e) {
      setMessage('createMsg', e.message || 'Error al crear el curso.');
    }
  });

  qs('btnUpdate').addEventListener('click', async () => {
    if (!SELECTED_ID) return;
    setMessage('editMsg', '');
    const payload = {
      course_id: SELECTED_ID,
      code: qs('editCode').value.trim(),
      name: qs('editName').value.trim(),
      term: qs('editTerm').value.trim(),
      plan_url: qs('editPlanUrl').value.trim(),
      is_active: SELECTED_ACTIVE ? 1 : 0,
    };
    try {
      await api.post('/admin/courses/update', payload);
      setMessage('editMsg', 'Curso actualizado.');
      await loadCourses();
    } catch (e) {
      setMessage('editMsg', e.message || 'Error al actualizar.');
    }
  });

  qs('btnDelete').addEventListener('click', async () => {
    if (!SELECTED_ID) return;
    if (!confirm('Vas a eliminar el curso seleccionado. ¿Continuar?')) return;
    const word = prompt('Escribí "ELIMINAR" para confirmar');
    if ((word || '').toUpperCase() !== 'ELIMINAR') { setMessage('editMsg', 'Cancelado.'); return; }
    try {
      await api.post('/admin/courses/delete', { course_id: SELECTED_ID, confirm: 'ELIMINAR' });
      SELECTED_ID = null;
      setMessage('editMsg', 'Curso eliminado.');
      await loadCourses();
      await loadUsers();
      await loadAssigned();
    } catch (e) {
      setMessage('editMsg', e.message || 'Error al eliminar.');
    }
  });

  qs('btnAssign').addEventListener('click', async () => {
    if (!SELECTED_ID) return;
    setMessage('assignMsg', '');
    const userId = Number(qs('assignUser').value || 0);
    if (!userId) { setMessage('assignMsg', 'Seleccioná un usuario.'); return; }
    try {
      await api.post('/admin/course-users/assign', { course_id: SELECTED_ID, user_id: userId });
      await loadAssigned();
      setMessage('assignMsg', 'Usuario asignado.');
    } catch (e) {
      setMessage('assignMsg', e.message || 'Error al asignar.');
    }
  });

  qs('btnToggleActive').addEventListener('click', () => {
    if (SELECTED_ID === null) return;
    SELECTED_ACTIVE = !SELECTED_ACTIVE;
    updateStatusBadge();
  });

  qs('btnOpenCreate').addEventListener('click', () => {
    openCreateModal();
  });
  qs('courseFilter').addEventListener('input', renderCourses);
  qs('btnCloseCreate').addEventListener('click', closeCreateModal);
  qs('btnCancelCreate').addEventListener('click', closeCreateModal);
  qs('createModal').addEventListener('click', (event) => {
    if (event.target === qs('createModal')) closeCreateModal();
  });
})();

function openCreateModal() {
  const modal = qs('createModal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  setMessage('createMsg', '');
}

function closeCreateModal() {
  const modal = qs('createModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  setMessage('createMsg', '');
}