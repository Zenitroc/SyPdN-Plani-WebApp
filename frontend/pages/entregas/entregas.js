renderMenu();

function qs(id){ return document.getElementById(id); }
function modalShow(id){ qs(id).style.display='flex'; }
function modalHide(id){ qs(id).style.display='none'; }

let COURSE_ID = null;

// ==== Prefijo API con fallback (/api ... o sin /api) =========================
const API_BASES = ['/api/entregas', '/entregas'];
let apiBaseIdx = 0;

function isNotFound(val){
  const msg = String(val?.message || val?.error || val || '').toLowerCase();
  return msg.includes('not found') || msg.includes('404');
}

async function apiGet(pathAndQuery) {
  try {
    const r = await api.get(API_BASES[apiBaseIdx] + pathAndQuery);
    if (r && r.error && isNotFound(r) && apiBaseIdx === 0) {
      apiBaseIdx = 1; return await api.get(API_BASES[apiBaseIdx] + pathAndQuery);
    }
    return r;
  } catch (e) {
    if (isNotFound(e) && apiBaseIdx === 0) {
      apiBaseIdx = 1; return await api.get(API_BASES[apiBaseIdx] + pathAndQuery);
    }
    throw e;
  }
}

async function apiPost(path, body) {
  try {
    const r = await api.post(API_BASES[apiBaseIdx] + path, body);
    if (r && r.error && isNotFound(r) && apiBaseIdx === 0) {
      apiBaseIdx = 1; return await api.post(API_BASES[apiBaseIdx] + path, body);
    }
    return r;
  } catch (e) {
    if (isNotFound(e) && apiBaseIdx === 0) {
      apiBaseIdx = 1; return await api.post(API_BASES[apiBaseIdx] + path, body);
    }
    throw e;
  }
}
// ============================================================================

const termFilter = qs('termFilter');
const btnNew = qs('btnNew');
const content = qs('content');

// Modal NUEVO
const f_type = qs('f_type');
const f_term = qs('f_term');
const f_topic = qs('f_topic');
const f_due  = qs('f_due');
const f_name = qs('f_name');
const btnCreate = qs('btnCreate');
const nextNumberHint = qs('nextNumberHint');

// Modal EDITAR
const modalEdit = qs('modalEdit');
const e_topic = qs('e_topic');
const e_due = qs('e_due');
const e_name = qs('e_name');
const btnEditSave = qs('btnEditSave');

// Modal ELIMINAR
const modalDel = qs('modalDel');
const d_confirm = qs('d_confirm');
const btnDelConfirm = qs('btnDelConfirm');

let currentAssignmentId = null; // para editar/eliminar

(async function () {
  if (!api.getToken()) { location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/'); return; }
  COURSE_ID = Number.parseInt(await courseContext.require(), 10);

  termFilter.onchange = load;

  // Nueva
  btnNew.onclick = () => {
    f_type.value = 'TP';
    f_term.value = (['1','2'].includes(termFilter.value) ? termFilter.value : '1');
    f_topic.value = 'ORG';
    f_due.value = '';
    f_name.value = '';
    updateNextNumberHint();
    modalShow('modalNew');
  };
  document.querySelectorAll('[data-close]').forEach(el => el.onclick = () => {
    modalHide('modalNew'); modalHide('modalEdit'); modalHide('modalDel');
  });
  f_type.onchange = updateNextNumberHint;
  f_term.onchange = updateNextNumberHint;
  btnCreate.onclick = createAssignment;

  // Editar
  btnEditSave.onclick = saveEdit;

  // Eliminar
  d_confirm.addEventListener('input', () => {
    btnDelConfirm.disabled = (d_confirm.value.trim().toUpperCase() !== 'ELIMINAR');
  });
  btnDelConfirm.onclick = doDelete;

  await load();
})();

function payload(res){ return (res && typeof res==='object' && 'data' in res) ? res.data : res; }
const FAIL = new Set(['A','N_E','NO_SAT','N_S']);

function pass(code){ return code && !FAIL.has(code); }
function bgFor(code){
  if (!code) return '';
  return pass(code) ? 'background: rgba(22,163,74,.16);' : 'background: rgba(239,68,68,.16);';
}

function emptyData(){ return { groups:[], assignments:[], grades:[], grade_options:[], approval:{} }; }

async function fetchTermData(term){
  try {
    const r = await apiGet(`?course_id=${COURSE_ID}&term=${term}`);
    const p = payload(r);
    if (p && p.error && isNotFound(p)) return emptyData();
    return (p && typeof p==='object') ? p : emptyData();
  } catch(e){
    if (isNotFound(e)) return emptyData();
    throw e;
  }
}

async function load() {
  try {
    const term = termFilter.value;
    if (term === 'ALL') {
      const d1 = await fetchTermData(1);
      const d2 = await fetchTermData(2);
      content.innerHTML =
        `<h3 class="muted">1° Cuatrimestre</h3>${renderTable(d1, 1)}
         <div class="mt12"></div>
         <h3 class="muted">2° Cuatrimestre</h3>${renderTable(d2, 2)}`;
      bindListeners(content);
    } else {
      const d = await fetchTermData(term);
      content.innerHTML = renderTable(d, Number(term));
      bindListeners(content);
    }
  } catch (e) {
    content.innerHTML = `<div class="card" style="border-color:#ef4444">Error: ${escapeHtml(e.message||'')}</div>`;
  }
}

// Renderiza UNA tabla (para un cuatrimestre)
function renderTable(D, termNum){
  const { groups=[], assignments=[], grades=[], grade_options=[], approval={} } = D || emptyData();
  const idx = {};
  for (const g of grades) idx[`${g.assignment_id}:${g.group_id}`] = g.grade_code || '';

  let html = '<div class="tbl scroll-x"><table class="table compact"><thead><tr>';
  html += '<th style="min-width:220px">Grupo</th>';
  html += '<th style="width:120px">Aprob. %</th>';
  for (const a of assignments) {
    const tag = `${a.type}${a.number}`;
    html += `<th class="center" style="min-width:120px"><strong>${tag}</strong></th>`;
  }
  html += '</tr></thead><tbody>';

  // Filas de grupos
  for (const g of groups) {
    const ap = approval[g.id] || { ratio:null };
    const ratioTxt = ap.ratio==null ? '-' : `${ap.ratio}%`;
    const pillCls = ap.ratio==null ? '' : (ap.ratio >= 60 ? 'ok' : 'danger');

    html += `<tr>`;
    html += `<td><div class="row" style="gap:.5rem"><span class="pill">#${g.number}</span><strong>${escapeHtml(g.name||'')}</strong></div></td>`;
    html += `<td class="center">${ap.ratio==null ? '-' : `<span class="badge ${pillCls}">${ratioTxt}</span>`}</td>`;

    for (const a of assignments) {
      const val = idx[`${a.id}:${g.id}`] || '';
      html += `<td class="center" style="${bgFor(val)}">
        <select class="select grade" data-assign="${a.id}" data-group="${g.id}">
          <option value=""></option>
          ${gradeOptionsHtml(grade_options, val)}
        </select>
      </td>`;
    }
    html += `</tr>`;
  }

  // Filas meta al pie (Tema, Ejercicio, Fecha, Devueltas, Acciones)
  html += `<tr class="small"><td><strong>Tema</strong></td><td></td>`;
  for (const a of assignments) html += `<td class="center small">${a.topic || '-'}</td>`;
  html += `</tr>`;

  html += `<tr class="small"><td><strong>Ejercicio</strong></td><td></td>`;
  for (const a of assignments) html += `<td class="center small">${escapeHtml(a.name||'')}</td>`;
  html += `</tr>`;

  html += `<tr class="small"><td><strong>Fecha</strong></td><td></td>`;
  for (const a of assignments) html += `<td class="center small">${a.due_date || '-'}</td>`;
  html += `</tr>`;

  html += `<tr class="small"><td><strong>Devueltas</strong></td><td></td>`;
  for (const a of assignments) {
    const ret = a.returned ? 'checked' : '';
    html += `<td class="center"><input type="checkbox" data-assign-ret="${a.id}" ${ret}/></td>`;
  }
  html += `</tr>`;

  html += `<tr class="small"><td><strong>Acciones</strong></td><td></td>`;
  for (const a of assignments) {
    const dn = encodeURIComponent(a.name || '');
    const dd = encodeURIComponent(a.due_date || '');
    html += `<td class="center small">
      <button class="link" data-edit="${a.id}" data-topic="${a.topic||''}" data-name="${dn}" data-due="${dd}">Editar</button>
      ·
      <button class="link" data-del="${a.id}">Baja</button>
    </td>`;
  }
  html += `</tr>`;

  html += '</tbody></table></div>';

  if (!assignments.length) {
    html += `<div class="small muted mt8">No hay entregas para este cuatrimestre.</div>`;
  }
  return html;
}

function bindListeners(scope){
  // devuelto
  scope.querySelectorAll('[data-assign-ret]').forEach(el => {
    el.addEventListener('change', async (ev) => {
      const assignment_id = parseInt(ev.target.getAttribute('data-assign-ret'), 10);
      const returned = ev.target.checked ? 1 : 0;
      try { await apiPost('/devolver', { course_id: COURSE_ID, assignment_id, returned }); } catch {}
    });
  });

  // calificar
  scope.querySelectorAll('select.grade').forEach(el => {
    const applyBG = (el)=>{ el.parentElement.style.cssText = bgFor(el.value || ''); };
    applyBG(el);
    el.addEventListener('change', async (ev) => {
      const assignment_id = parseInt(ev.target.getAttribute('data-assign'), 10);
      const group_id = parseInt(ev.target.getAttribute('data-group'), 10);
      const grade_code = ev.target.value || null;
      try { await apiPost('/calificar', { course_id: COURSE_ID, assignment_id, group_id, grade_code }); }
      finally { await load(); }
    });
  });

  // editar
  scope.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      currentAssignmentId = parseInt(btn.getAttribute('data-edit'),10);
      e_topic.value = btn.getAttribute('data-topic') || 'ORG';
      e_due.value = decodeURIComponent(btn.getAttribute('data-due') || '') || '';
      e_name.value = decodeURIComponent(btn.getAttribute('data-name') || '') || '';
      modalShow('modalEdit');
    });
  });

  // eliminar
  scope.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      currentAssignmentId = parseInt(btn.getAttribute('data-del'),10);
      d_confirm.value = ''; btnDelConfirm.disabled = true;
      modalShow('modalDel');
    });
  });
}

function gradeOptionsHtml(list, selected) {
  return (list||[]).map(code =>
    `<option value="${escapeHtml(code)}"${code===selected?' selected':''}>${escapeHtml(code)}</option>`
  ).join('');
}

async function updateNextNumberHint() {
  const type = f_type.value;
  const term = parseInt(f_term.value,10);
  if (!['TP','TPC','TPR'].includes(type) || ![1,2].includes(term)) { nextNumberHint.textContent=''; return; }
  try {
    const res = await apiGet(`/next-number?course_id=${COURSE_ID}&type=${type}&term=${term}`);
    const p = payload(res);
    nextNumberHint.textContent = p?.next ? `Se creará como ${type}${p.next}` : '';
  } catch { nextNumberHint.textContent = ''; }
}

async function createAssignment() {
  const body = {
    course_id: COURSE_ID,
    type: f_type.value,
    term: parseInt(f_term.value,10),
    topic: f_topic.value,
    due_date: f_due.value || '',
    name: f_name.value.trim()
  };
  if (!body.name) { alert('Nombre requerido'); return; }
  try {
    const r = await apiPost('/crear', body);
    if (r && r.error) throw new Error(r.error);
    modalHide('modalNew');
    await load();
  } catch (e) { alert(e.message || 'No se pudo crear'); }
}

async function saveEdit() {
  if (!currentAssignmentId) return;
  const body = {
    course_id: COURSE_ID,
    assignment_id: currentAssignmentId,
    topic: e_topic.value,
    due_date: e_due.value || '',
    name: e_name.value.trim()
  };
  if (!body.name) { alert('Nombre requerido'); return; }
  try {
    const r = await apiPost('/editar', body);
    if (r && r.error) throw new Error(r.error);
    modalHide('modalEdit');
    await load();
  } catch (e) { alert(e.message || 'No se pudo guardar'); }
}

async function doDelete() {
  if (!currentAssignmentId) return;
  try {
    const r = await apiPost('/eliminar', { course_id: COURSE_ID, assignment_id: currentAssignmentId, confirm: 'ELIMINAR' });
    if (r && r.error) throw new Error(r.error);
    modalHide('modalDel');
    await load();
  } catch (e) { alert(e.message || 'No se pudo eliminar (verificá permisos GURU)'); }
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
