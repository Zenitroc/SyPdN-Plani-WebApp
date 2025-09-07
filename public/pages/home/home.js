renderMenu();

// Helpers API con fallback /api
function isNotFound(val){
  const s = String(val?.message || val?.error || val || '').toLowerCase();
  return s.includes('not found') || s.includes('404');
}
async function apiTryGet(path){ // prueba /path luego /api/path
  try{
    const r = await api.get(path);
    if (r && r.error && isNotFound(r)) throw new Error('NF1');
    return r;
  }catch(e1){
    try{
      const r2 = await api.get('/api' + path);
      if (r2 && r2.error && isNotFound(r2)) throw new Error('NF2');
      return r2;
    }catch(e2){ throw e2; }
  }
}
async function apiTryPost(path, body, opts){
  try{
    const r = await api.post(path, body, opts);
    if (r && r.error && isNotFound(r)) throw new Error('NF1');
    return r;
  }catch(e1){
    try{
      const r2 = await api.post('/api' + path, body, opts);
      if (r2 && r2.error && isNotFound(r2)) throw new Error('NF2');
      return r2;
    }catch(e2){ throw e2; }
  }
}
function payload(res){ return (res && typeof res==='object' && 'data' in res) ? res.data : res; }

(async function init() {
  const mainEl = document.getElementById('main') || document.querySelector('main');
  const loginBox = document.getElementById('loginBox');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');

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

  // LOGIN
  if (!api.getToken()) {
    if (mainEl) mainEl.classList.add('center-screen');
    if (loginBox) loginBox.style.display = 'block';
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        loginMsg.textContent = '';
        try {
          const r = await apiTryPost('/auth/login', {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
          }, { noAuth: true });
          const tk = r?.token || r?.data?.token;
          if (!tk) throw new Error('Token no recibido');
          api.setToken(tk);
          location.reload();
        } catch (err) {
          loginMsg.textContent = err.message || 'Error de login';
        }
      };
    }
    return;
  }

  if (mainEl) mainEl.classList.remove('center-screen');

  try {
    // Perfil
    const me = payload(await apiTryGet('/me'));
    const isGuru = Array.isArray(me?.roles) && me.roles.includes('GURU');

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
          try { await apiTryPost('/session/course', { course_id: id }); } catch {}
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
      ? `<div class="login-actions" style="justify-content:flex-start;margin-top:.75rem">
           <button id="goAllStudents" class="btn btn-tonal">Todos los estudiantes</button>
         </div>`
      : '';
    document.getElementById('kpis').innerHTML = `
      <div class="card fx-pop">
        <b>Bienvenido, ${me.name}</b>. Seleccioná una comisión para comenzar.
        ${guruBtn}
      </div>`;
    if (isGuru) {
      document.getElementById('goAllStudents').onclick = () => {
        location.href = BASE_APP + '/public/pages/alumnos-global/';
      };
    }

  } catch (e) {
    // Si algo falla, mostramos mensaje y NO entramos en loop
    document.getElementById('kpis').innerHTML = `
      <div class="card" style="border-color:#ef4444">Error cargando Home: ${escapeHtml(e.message||'')}</div>`;
  }

  // === helpers ===
  function renderSelected(c){
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

  function cardHtml(c, canEdit){
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

  function escapeHtml(s){
    return (s||'').toString().replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[m]));
  }
})();
