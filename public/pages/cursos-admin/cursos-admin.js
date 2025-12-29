renderMenu();

function qs(id){ return document.getElementById(id); }

let COURSES = [];
let USERS = [];
let ASSIGNED = [];
let SELECTED_ID = null;

function setMessage(id, msg){ qs(id).textContent = msg || ''; }

function courseById(id){ return COURSES.find(c => Number(c.id) === Number(id)); }

function renderCourses(){
  const el = qs('coursesTable');
  if (!COURSES.length) {
    el.innerHTML = '<div class="card">No hay cursos cargados.</div>';
    return;
  }
  const rows = COURSES.map(c => {
    const active = Number(c.is_active) === 1;
    const checked = Number(c.id) === Number(SELECTED_ID) ? 'checked' : '';
    return `
      <tr>
        <td><input type="radio" name="coursePick" value="${c.id}" ${checked}></td>
        <td>${c.code ?? ''}</td>
        <td>${c.name ?? ''}</td>
        <td>${c.term ?? ''}</td>
        <td><span class="pill ${active ? 'on' : 'off'}">${active ? 'Activo' : 'Inactivo'}</span></td>
      </tr>`;
  }).join('');
  el.innerHTML = `
    <table class="tbl">
      <thead>
        <tr>
          <th></th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Term</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  Array.from(document.querySelectorAll('input[name="coursePick"]')).forEach(radio => {
    radio.addEventListener('change', () => {
      SELECTED_ID = Number(radio.value);
      applySelection();
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

  qs('editCode').value = course.code ?? '';
  qs('editName').value = course.name ?? '';
  qs('editTerm').value = course.term ?? '';
  qs('editPlanUrl').value = course.plan_url ?? '';
  qs('editActive').checked = Number(course.is_active) === 1;

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
  el.innerHTML = ASSIGNED.map(u => `
    <div class="row-between">
      <div>${u.name} <span class="muted">(${u.username})</span></div>
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
  if (!api.getToken()) { location.href = BASE_APP + '/public/pages/home/'; return; }
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
      is_active: qs('newActive').checked ? 1 : 0,
    };
    try {
      const res = await api.post('/admin/courses/create', payload);
      setMessage('createMsg', `Curso creado (ID ${res.id}).`);
      qs('newCode').value = '';
      qs('newName').value = '';
      qs('newTerm').value = '';
      qs('newPlanUrl').value = '';
      qs('newActive').checked = true;
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
      is_active: qs('editActive').checked ? 1 : 0,
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
})();