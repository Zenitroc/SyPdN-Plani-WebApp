renderMenu();

// Helpers API con fallback /api
function isNotFound(val) {
  const s = String(val?.message || val?.error || val || '').toLowerCase();
  return s.includes('not found') || s.includes('404');
}
async function apiTryGet(path) { // prueba /path luego /api/path
  try {
    const r = await api.get(path);
    if (r && r.error && isNotFound(r)) throw new Error('NF1');
    return r;
  } catch (e1) {
    try {
      const r2 = await api.get('/api' + path);
      if (r2 && r2.error && isNotFound(r2)) throw new Error('NF2');
      return r2;
    } catch (e2) { throw e2; }
  }
}
async function apiTryPost(path, body, opts) {
  try {
    const r = await api.post(path, body, opts);
    if (r && r.error && isNotFound(r)) throw new Error('NF1');
    return r;
  } catch (e1) {
    try {
      const r2 = await api.post('/api' + path, body, opts);
      if (r2 && r2.error && isNotFound(r2)) throw new Error('NF2');
      return r2;
    } catch (e2) { throw e2; }
  }
}
function payload(res) { return (res && typeof res === 'object' && 'data' in res) ? res.data : res; }

(async function init() {
  const mainEl = document.getElementById('main') || document.querySelector('main');

  const selectedCourseBox = document.getElementById('selectedCourse');
  const courseBox = document.getElementById('courseBox');
  const courseGrid = document.getElementById('courseGrid');
  const searchInput = document.getElementById('searchInput');

  // Mostrar/ocultar menú según course seleccionado
  const appMenu = document.getElementById('appMenu');
  const ensureMenuVisibility = () => {
    const current = courseContext.get && courseContext.get();
    appMenu.style.display = current ? '' : 'none';
  };
  ensureMenuVisibility();

  // Redirigir a login si no hay token
  if (!api.getToken()) {
    location.href = '../login/';
    return;
  }

  if (mainEl) mainEl.classList.remove('center-screen');

  let me;
  let isGuru = false;
  try {
    // Perfil (verifica token)
    me = payload(await apiTryGet('/me'));
    isGuru = Array.isArray(me?.roles) && me.roles.includes('GURU');
    if (me?.must_change_password) {
      alert('Por seguridad, necesitás cambiar tu contraseña antes de continuar.');
      location.href = BASE_APP + '/public/pages/perfil/?force=1';
      return;
    }
  } catch {
    api.clearToken();
    location.href = '../login/';
    return;
  }

  try {

    // Cursos (GURÚ ve todos)
    const list = payload(await apiTryGet(isGuru ? '/courses?scope=all' : '/courses'));

    // Normalizar
    let courses = (Array.isArray(list) ? list : (list?.courses || []))
      .map(c => ({
        id: c.id ?? c.course_id ?? c.ID ?? 0,
        name: c.name ?? c.title ?? c.codigo ?? 'Curso',
        year: c.year ?? c.anio ?? '',
        term: c.term ?? c.cuatrimestre ?? '',
        extra: c.commission ?? c.number ?? c.division ?? '',
        color: '' // se completa abajo
      }));

    // === COLORES: traer mapa y mezclar ===
    try {
      const colorsRes = payload(await apiTryGet(isGuru ? '/courses/colors?scope=all' : '/courses/colors'));
      const colorsArr = colorsRes?.colors || (Array.isArray(colorsRes) ? colorsRes : []);
      const colorMap = {};
      colorsArr.forEach(r => { if (r && r.course_id) colorMap[r.course_id] = r.color_hex || ''; });
      courses = courses.map(c => ({ ...c, color: colorMap[c.id] || '' }));
    } catch { /* si no existe endpoint, seguimos sin color */ }

    // Actualizar barra curso seleccionado
    const currentId = courseContext.get && courseContext.get();
    const current = courses.find(c => String(c.id) === String(currentId));
    renderSelected(current);

    // Grid de cards
    courseBox.style.display = 'block';
    const paint = (arr) => {
      if (!arr.length) {
        courseGrid.innerHTML = `<div class="muted">No hay comisiones para mostrar.</div>`;
        return;
      }
      courseGrid.innerHTML = arr.map(c => cardHtml(c, isGuru)).join('');

      // Seleccionar curso
      courseGrid.querySelectorAll('[data-select]').forEach(btn => {
        btn.onclick = async () => {
          const id = Number(btn.getAttribute('data-select'));
          try { await apiTryPost('/session/course', { course_id: id }); } catch { }
          courseContext.set(id);
          ensureMenuVisibility();
          const sel = courses.find(c => c.id === id);
          renderSelected(sel);
        };
      });

      // Guardar color (solo GURÚ)
      if (isGuru) {
        courseGrid.querySelectorAll('input[type="color"][data-color-for]').forEach(inp => {
          inp.onchange = async () => {
            const id = Number(inp.getAttribute('data-color-for'));
            const hex = (inp.value || '').toUpperCase();
            try {
              await apiTryPost('/course-color/guardar', { course_id: id, color_hex: hex });
              const idx = courses.findIndex(x => x.id === id);
              if (idx >= 0) { courses[idx].color = hex; paint(courses); }
            } catch (e) { alert(e.message || 'No se pudo guardar color'); }
          };
        });
      }
    };

    const filter = (q) => {
      q = (q || '').toLowerCase().trim();
      if (!q) return courses;
      return courses.filter(c =>
        String(c.name).toLowerCase().includes(q) ||
        String(c.year).toLowerCase().includes(q) ||
        String(c.term).toLowerCase().includes(q) ||
        String(c.extra).toLowerCase().includes(q) ||
        String(c.id).includes(q)
      );
    };
    searchInput.oninput = () => paint(filter(searchInput.value));

    paint(courses);

    // KPIs + botón solo Gurú (igual a tu UX)
    const guruBtn = isGuru
      ? `<div class="login-actions" style="justify-content:flex-start;margin-top:.75rem;gap:.5rem;flex-wrap:wrap">
           <button id="goAllStudents" class="btn btn-tonal">Ver todos los estudiantes</button>
           <button id="goCourseAdmin" class="btn btn-primary">Gestionar cursos</button>
           <button id="goUserAdmin" class="btn btn-primary">Gestionar usuarios</button>
         </div>`
      : '';
    document.getElementById('kpis').innerHTML = `
      <div class="card fx-pop">
        <b>Hola, ${me.name}!</b>. Seleccioná una comisión para comenzar.
        ${guruBtn}
      </div>`;
    if (isGuru) {
      document.getElementById('goAllStudents').onclick = () => {
        location.href = BASE_APP + '/public/pages/alumnos-global/';
      };
      document.getElementById('goCourseAdmin').onclick = () => {
        location.href = BASE_APP + '/public/pages/cursos-admin/';
      };
      document.getElementById('goUserAdmin').onclick = () => {
        location.href = BASE_APP + '/public/pages/usuarios-admin/';
      };
    }

     if (isGuru) {
      await initUserManager();
    }


  } catch (e) {
    // Si algo falla, mostramos mensaje y NO entramos en loop
    document.getElementById('kpis').innerHTML = `
      <div class="card" style="border-color:#ef4444">Error cargando Home: ${escapeHtml(e.message || '')}</div>`;
  }

  // === helpers ===
  function renderSelected(c) {
    if (!c) { selectedCourseBox.style.display = 'none'; return; }
    selectedCourseBox.style.display = 'block';
    const subtitle = [
      c.year ? `Año: ${escapeHtml(String(c.year))}` : '',
      c.term ? `Cuatri: ${escapeHtml(String(c.term))}` : '',
      c.extra ? `Comisión: ${escapeHtml(String(c.extra))}` : ''
    ].filter(Boolean).join(' · ');
    const border = c.color ? `border-left:6px solid ${c.color};` : '';
    selectedCourseBox.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;${border}padding-left:.75rem">
        <div>
          <div class="muted small">Curso seleccionado</div>
          <h3 class="m0">${escapeHtml(c.name)} <span class="muted small">(#${c.id})</span></h3>
          <div class="muted">${subtitle || '&nbsp;'}</div>
        </div>
        <div class="row" style="gap:.5rem">
          <button class="btn" onclick="location.href='${BASE_APP}/public/pages/entregas/'">Ir a Entregas</button>
          <button class="btn btn-tonal" onclick="location.href='${BASE_APP}/public/pages/estudiantes/'">Ver Estudiantes</button>
        </div>
      </div>
    `;
  }

  function cardHtml(c, canEdit) {
    const subtitle = [
      c.year ? `Año: ${escapeHtml(String(c.year))}` : '',
      c.term ? `Comisión: ${escapeHtml(String(c.term))}` : '',
      c.extra ? `Comisión: ${escapeHtml(String(c.extra))}` : ''
    ].filter(Boolean).join(' · ');
    const accent = c.color || '';
    const border = accent ? `border-left:6px solid ${accent};` : '';
    const swatch = accent ? `<span title="${accent}" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${accent};border:1px solid var(--border);"></span>` : '<span style="width:12px;height:12px;display:inline-block;border-radius:50%;border:1px solid var(--border);background:transparent"></span>';
    const editor = canEdit ? `
      <div class="row" style="gap:.4rem;align-items:center">
        ${swatch}
        <input type="color" value="${accent || '#cccccc'}" data-color-for="${c.id}" style="appearance:none;border:none;width:22px;height:22px;padding:0;background:transparent;cursor:pointer">
      </div>` : '';
    return `
      <div class="card" style="width:280px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between;${border}padding-left:.75rem">
        <div>
          <div class="muted small">ID ${c.id}</div>
          <h3 class="m0" style="margin-top:.2rem">${escapeHtml(c.name)}</h3>
          <div class="muted" style="margin-top:.25rem">${subtitle || '&nbsp;'}</div>
        </div>
        <div class="row" style="justify-content:space-between;gap:.5rem">
          ${editor}
          <div class="row end" style="gap:.5rem">
            <button class="btn primary" data-select="${c.id}">Seleccionar</button>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[m]));
  }
   async function initUserManager() {
    const userManager = document.getElementById('userManager');
    if (!userManager) return;
    userManager.style.display = 'block';

    let USERS = [];
    let ROLES = [];
    let COURSES = [];
    let selectedUser = null;
    let createPhotoData = null;

    const userList = document.getElementById('userList');
    const userDetail = document.getElementById('userDetail');
    const userSearch = document.getElementById('userSearch');
    const createPanel = document.getElementById('userCreatePanel');
    const createMsg = document.getElementById('createUserMsg');

    const apiGet = async (p) => payload(await apiTryGet(p));
    const apiPost = async (p, b) => payload(await apiTryPost(p, b));

    const loadRoles = async () => {
      ROLES = await apiGet('/admin/roles');
    };
    const loadCourses = async () => {
      const res = await apiGet('/courses?scope=all');
      COURSES = (Array.isArray(res) ? res : (res?.courses || []))
        .map(c => ({
          id: c.id ?? c.course_id ?? c.ID ?? 0,
          name: c.name ?? c.title ?? c.codigo ?? 'Curso',
          term: c.term ?? c.cuatrimestre ?? '',
          year: c.year ?? c.anio ?? '',
        }));
    };
    const loadUsers = async () => {
      USERS = await apiGet('/admin/users');
    };

    const renderRolesOptions = () => {
      const container = document.getElementById('newUserRoles');
      if (!container) return;
      container.innerHTML = ROLES.map(r => `
        <label class="pill">
          <input type="checkbox" value="${escapeHtml(r.code)}" />
          ${escapeHtml(r.code)}
        </label>`).join('');
    };

    const roleBadges = (roles) => {
      const list = Array.isArray(roles) ? roles : [];
      if (!list.length) return '<span class="muted">Sin roles</span>';
      return list.map(r => `<span class="pill">${escapeHtml(r)}</span>`).join('');
    };

    const renderList = (items) => {
      if (!items.length) {
        userList.innerHTML = '<div class="muted">No hay usuarios para mostrar.</div>';
        return;
      }
      userList.innerHTML = items.map(u => {
        const fullName = `${u.name || ''}${u.last_name ? ' ' + u.last_name : ''}`.trim();
        const initials = fullName ? fullName.split(/\s+/).slice(0,2).map(p => p[0]?.toUpperCase() || '').join('') : (u.username || '').slice(0,2).toUpperCase();
        const active = selectedUser && Number(selectedUser.id) === Number(u.id) ? 'active' : '';
        const avatar = u.photo_url
          ? `<img src="${u.photo_url}" class="user-avatar" alt="Foto de ${escapeHtml(fullName)}">`
          : `<span class="user-avatar fallback">${escapeHtml(initials)}</span>`;
        return `
          <div class="user-card ${active}" data-user="${u.id}">
            <div class="row" style="justify-content:space-between">
              <div class="row">
                ${avatar}
                <div>
                  <div style="font-weight:600">${escapeHtml(fullName || u.username || '')}</div>
                  <div class="muted" style="font-size:.85rem">${escapeHtml(u.username || '')} · ${escapeHtml(u.email || '')}</div>
                </div>
              </div>
              <button class="btn btn-ghost" data-open="${u.id}">Ver</button>
            </div>
            <div class="row" style="margin-top:.5rem;flex-wrap:wrap;gap:.4rem">${roleBadges(u.roles)}</div>
          </div>`;
      }).join('');

      userList.querySelectorAll('[data-open]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.open);
          await openUserDetail(id);
        });
      });
    };

    const renderDetail = (detail) => {
      if (!detail) {
        userDetail.innerHTML = '<div class="muted">Seleccioná un usuario para ver el detalle.</div>';
        return;
      }
      const user = detail.user;
      const courses = detail.courses || [];
      const fullName = `${user.name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim();
      const initials = fullName ? fullName.split(/\s+/).slice(0,2).map(p => p[0]?.toUpperCase() || '').join('') : (user.username || '').slice(0,2).toUpperCase();
      const avatar = user.photo_url
        ? `<img src="${user.photo_url}" class="user-avatar" alt="Foto de ${escapeHtml(fullName)}">`
        : `<span class="user-avatar fallback">${escapeHtml(initials)}</span>`;
      const roleCheckboxes = ROLES.map(r => {
        const checked = user.roles?.includes(r.code) ? 'checked' : '';
        return `<label class="pill"><input type="checkbox" value="${escapeHtml(r.code)}" ${checked}/> ${escapeHtml(r.code)}</label>`;
      }).join('');
      const courseOptions = COURSES.filter(c => !courses.some(x => Number(x.id) === Number(c.id)))
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)} ${c.term ? '(' + escapeHtml(c.term) + ')' : ''}</option>`).join('');
      userDetail.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div class="row">
            ${avatar}
            <div>
              <div style="font-weight:600">${escapeHtml(fullName || user.username || '')}</div>
              <div class="muted" style="font-size:.85rem">${escapeHtml(user.username || '')}</div>
            </div>
          </div>
          <button id="btnDeleteUser" class="btn btn-danger">Eliminar</button>
        </div>
        <div class="grid cols-2" style="margin-top:1rem">
          <label class="label">Nombre
            <input id="editName" class="input" type="text" value="${escapeHtml(user.name || '')}" />
          </label>
          <label class="label">Apellido
            <input id="editLastName" class="input" type="text" value="${escapeHtml(user.last_name || '')}" />
          </label>
          <label class="label">Usuario
            <input id="editUsername" class="input" type="text" value="${escapeHtml(user.username || '')}" />
          </label>
          <label class="label">Email institucional
            <input id="editEmail" class="input" type="email" value="${escapeHtml(user.email || '')}" />
          </label>
          <label class="label">Email personal
            <input id="editPersonalEmail" class="input" type="email" value="${escapeHtml(user.personal_email || '')}" />
          </label>
          <label class="label">Legajo
            <input id="editLegajo" class="input" type="text" value="${escapeHtml(user.legajo || '')}" />
          </label>
          <label class="label">Teléfono
            <input id="editPhone" class="input" type="text" value="${escapeHtml(user.phone || '')}" />
          </label>
          <label class="label">Foto (opcional)
            <input id="editPhoto" class="input" type="file" accept="image/*" />
            <small class="hint">Máximo 200KB.</small>
          </label>
        </div>
        <div class="label" style="margin-top:1rem">Roles</div>
        <div id="editRoles" class="row" style="flex-wrap:wrap;gap:.5rem">${roleCheckboxes}</div>
        <div class="row" style="margin-top:1rem;justify-content:flex-end;gap:.5rem">
          <button id="btnResetPassword" class="btn btn-ghost">Resetear contraseña</button>
          <button id="btnSaveUser" class="btn btn-primary">Guardar cambios</button>
        </div>
        <div id="userSaveMsg" class="muted" style="margin-top:.5rem"></div>

        <div style="margin-top:1.25rem">
          <h4 style="margin:.2rem 0">Cursos asignados</h4>
          <div id="userCoursesList" class="grid" style="gap:.5rem;margin-top:.5rem">
            ${courses.length ? courses.map(c => `
              <div class="row-between user-card" style="padding:.5rem">
                <div>
                  <div style="font-weight:600">${escapeHtml(c.name || '')}</div>
                  <div class="muted" style="font-size:.85rem">${escapeHtml(c.code || '')} ${c.term ? '· ' + escapeHtml(c.term) : ''}</div>
                </div>
                <button class="btn btn-ghost" data-unassign="${c.id}">Quitar</button>
              </div>`).join('') : '<div class="muted">No tiene cursos asignados.</div>'}
          </div>
          <div class="row" style="margin-top:.75rem;gap:.5rem">
            <select id="assignCourseSelect" class="select" style="min-width:220px">
              <option value=\"\">Seleccioná un curso</option>
              ${courseOptions}
            </select>
            <button id="btnAssignCourse" class="btn btn-primary">Asignar</button>
          </div>
        </div>
      `;

      let editPhotoData = user.photo_url || null;
      const editPhotoInput = document.getElementById('editPhoto');
      editPhotoInput?.addEventListener('change', () => {
        const file = editPhotoInput.files?.[0];
        if (!file) return;
        if (file.size > 200 * 1024) {
          alert('La foto supera el límite de 200KB.');
          editPhotoInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = () => { editPhotoData = reader.result; };
        reader.readAsDataURL(file);
      });

      document.getElementById('btnSaveUser').addEventListener('click', async () => {
        const msg = document.getElementById('userSaveMsg');
        msg.textContent = '';
        const selectedRoles = Array.from(document.querySelectorAll('#editRoles input[type=\"checkbox\"]:checked'))
          .map(i => i.value);
        const payload = {
          user_id: user.id,
          name: document.getElementById('editName').value.trim(),
          last_name: document.getElementById('editLastName').value.trim(),
          username: document.getElementById('editUsername').value.trim(),
          email: document.getElementById('editEmail').value.trim(),
          personal_email: document.getElementById('editPersonalEmail').value.trim(),
          legajo: document.getElementById('editLegajo').value.trim(),
          phone: document.getElementById('editPhone').value.trim(),
          roles: selectedRoles,
          photo_data: editPhotoData,
        };
        try {
          await apiPost('/admin/users/update', payload);
          msg.textContent = 'Usuario actualizado.';
          await reloadAll();
          await openUserDetail(user.id);
        } catch (e) {
          msg.textContent = e.message || 'Error al guardar.';
        }
      });

      document.getElementById('btnResetPassword').addEventListener('click', async () => {
        if (!confirm('Esto reseteará la contraseña al nombre de usuario. ¿Continuar?')) return;
        await apiPost('/admin/users/update', { user_id: user.id, reset_password: true });
        alert('Contraseña reseteada. El usuario deberá cambiarla al iniciar sesión.');
      });

      document.getElementById('btnDeleteUser').addEventListener('click', async () => {
        if (!confirm('Vas a eliminar este usuario. ¿Continuar?')) return;
        const word = prompt('Escribí \"ELIMINAR\" para confirmar');
        if (word !== 'ELIMINAR') return;
        await apiPost('/admin/users/delete', { user_id: user.id, confirm: 'ELIMINAR' });
        selectedUser = null;
        await reloadAll();
        renderDetail(null);
      });

      document.querySelectorAll('[data-unassign]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const courseId = Number(btn.dataset.unassign);
          await apiPost('/admin/course-users/unassign', { course_id: courseId, user_id: user.id });
          await openUserDetail(user.id);
        });
      });

      document.getElementById('btnAssignCourse').addEventListener('click', async () => {
        const sel = document.getElementById('assignCourseSelect');
        const courseId = Number(sel.value || 0);
        if (!courseId) return;
        await apiPost('/admin/course-users/assign', { course_id: courseId, user_id: user.id });
        await openUserDetail(user.id);
      });
    };

    const openUserDetail = async (id) => {
      const detail = await apiGet(`/admin/user-detail?user_id=${id}`);
      selectedUser = detail.user;
      renderList(filterUsers(userSearch.value));
      renderDetail(detail);
    };

    const filterUsers = (q) => {
      q = (q || '').toLowerCase().trim();
      if (!q) return USERS;
      return USERS.filter(u => {
        const fullName = `${u.name || ''} ${u.last_name || ''}`.toLowerCase();
        return fullName.includes(q) ||
          String(u.username || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q);
      });
    };

    const reloadAll = async () => {
      await loadUsers();
      renderList(filterUsers(userSearch.value));
    };

    userSearch.addEventListener('input', () => renderList(filterUsers(userSearch.value)));
    document.getElementById('btnToggleCreate').addEventListener('click', () => {
      createPanel.style.display = createPanel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btnCancelCreate').addEventListener('click', () => {
      createPanel.style.display = 'none';
      createMsg.textContent = '';
    });

    const newPhotoInput = document.getElementById('newUserPhoto');
    newPhotoInput.addEventListener('change', () => {
      const file = newPhotoInput.files?.[0];
      if (!file) return;
      if (file.size > 200 * 1024) {
        alert('La foto supera el límite de 200KB.');
        newPhotoInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { createPhotoData = reader.result; };
      reader.readAsDataURL(file);
    });

    document.getElementById('btnCreateUser').addEventListener('click', async () => {
      createMsg.textContent = '';
      const selectedRoles = Array.from(document.querySelectorAll('#newUserRoles input[type=\"checkbox\"]:checked'))
        .map(i => i.value);
      const payload = {
        name: document.getElementById('newUserName').value.trim(),
        last_name: document.getElementById('newUserLastName').value.trim(),
        username: document.getElementById('newUserUsername').value.trim(),
        email: document.getElementById('newUserEmail').value.trim(),
        personal_email: document.getElementById('newUserPersonalEmail').value.trim(),
        legajo: document.getElementById('newUserLegajo').value.trim(),
        phone: document.getElementById('newUserPhone').value.trim(),
        roles: selectedRoles,
        photo_data: createPhotoData,
      };
      try {
        const res = await apiPost('/admin/users/create', payload);
        createMsg.textContent = res?.email_sent
          ? 'Usuario creado y correo enviado.'
          : 'Usuario creado (no se pudo enviar el correo).';
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserLastName').value = '';
        document.getElementById('newUserUsername').value = '';
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPersonalEmail').value = '';
        document.getElementById('newUserLegajo').value = '';
        document.getElementById('newUserPhone').value = '';
        newPhotoInput.value = '';
        createPhotoData = null;
        document.querySelectorAll('#newUserRoles input[type=\"checkbox\"]').forEach(i => { i.checked = false; });
        await reloadAll();
      } catch (e) {
        createMsg.textContent = e.message || 'Error al crear usuario.';
      }
    });

    await loadRoles();
    await loadCourses();
    await loadUsers();
    renderRolesOptions();
    renderList(USERS);
  }
})();
