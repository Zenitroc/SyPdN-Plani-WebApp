renderMenu();

function qs(id){ return document.getElementById(id); }
function modalShow(id){ qs(id).style.display='flex'; }
function modalHide(id){ qs(id).style.display='none'; }

let DATA = [];
let STATUS_FILTER = 'ALL';
let IS_GURU = false;

function filteredRows(){
  if (STATUS_FILTER === 'ALTA') return DATA.filter(x=>x.status==='ALTA');
  if (STATUS_FILTER === 'BAJA') return DATA.filter(x=>x.status==='BAJA');
  return DATA;
}

function renderSummary(){
  const total = DATA.length;
  const altas = DATA.filter(x=>x.status==='ALTA').length;
  const bajas = total - altas;
  qs('summary').textContent = `Inscriptos: ${total} · Regulares (ALTA): ${altas} · Bajas: ${bajas}`;
}

function renderTable(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!rows || !rows.length) { el.innerHTML = '<div class="card">No hay estudiantes para mostrar.</div>'; renderSummary(); return; }
  const th = `<tr>
    <th><input type="checkbox" id="pickAll"></th>
    <th>ID</th><th>Estado</th><th>Apellido</th><th>Nombre</th>
    <th>Legajo</th><th>Email</th><th>Grupo</th><th>Obs</th>
  </tr>`;
  const tr = rows.map(r => `<tr>
    <td><input type="checkbox" class="pick" data-id="${r.id}"></td>
    <td>${r.course_id_seq ?? ''}</td>
    <td>${r.status ?? ''}</td>
    <td>${r.apellido ?? ''}</td>
    <td>${r.nombre ?? ''}</td>
    <td>${r.legajo ?? ''}</td>
    <td>${r.email_inst ?? ''}</td>
    <td>${r.group_no ?? ''}</td>
    <td>${r.observaciones ?? ''}</td>
  </tr>`).join('');
  el.innerHTML = `
    <style>.tbl{border-collapse:collapse;width:100%} .tbl th,.tbl td{border:1px solid var(--border);padding:.5rem} .tbl th{background:color-mix(in oklab, var(--surface) 70%, var(--bg));text-align:left}</style>
    <div class="card"><table class="tbl">${th}${tr}</table></div>`;

  const pickAll = document.getElementById('pickAll');
  if (pickAll) pickAll.onchange = () => {
    document.querySelectorAll('.pick').forEach(cb => { cb.checked = pickAll.checked; });
  };

  renderSummary();
}

function getSelectedIds(){
  return Array.from(document.querySelectorAll('.pick:checked')).map(x=>Number(x.dataset.id));
}

function renderEditTable(rows){
  const th = `<tr>
    <th>ID</th>
    <th>Estado</th>
    <th>Apellido</th><th>Nombre</th>
    <th>Legajo</th><th>Email</th>
    <th>Grupo#</th><th>Obs</th>
  </tr>`;
  const tr = rows.map(r => `
    <tr data-enr="${r.id}">
      <td>${r.course_id_seq}</td>
      <td>
        <select class="input" data-k="status">
          <option value="ALTA" ${r.status==='ALTA'?'selected':''}>ALTA</option>
          <option value="BAJA" ${r.status==='BAJA'?'selected':''}>BAJA</option>
        </select>
      </td>
      <td><input class="input" data-k="last_name"  value="${r.apellido ?? ''}"></td>
      <td><input class="input" data-k="first_name" value="${r.nombre ?? ''}"></td>
      <td><input class="input" data-k="legajo"     value="${r.legajo ?? ''}"></td>
      <td><input class="input" data-k="email_inst" value="${r.email_inst ?? ''}"></td>
      <td><input class="input" data-k="group_number" type="number" min="1" step="1" value="${r.group_no ?? ''}" placeholder=""></td>
      <td><input class="input" data-k="observaciones" value="${r.observaciones ?? ''}"></td>
    </tr>`).join('');
  qs('editTable').innerHTML = `<div class="card"><table class="tbl">${th}${tr}</table></div>`;
}

(async function () {
  if (!api.getToken()) { location.href = BASE_APP + '/public/pages/home/'; return; }
  const me = await api.get('/me');
  IS_GURU = me.roles.includes('GURU');
  if (IS_GURU) qs('btnDelete').style.display = 'inline-flex';

  const courseId = await courseContext.require();

  async function load() {
    DATA = await api.get(`/estudiantes?course_id=${courseId}`);
    renderTable('table', filteredRows());
  }

  // Filtro estado
  qs('fltStatus').addEventListener('change', () => {
    STATUS_FILTER = qs('fltStatus').value;
    renderTable('table', filteredRows());
  });

  // Barra
  qs('btnRefresh').onclick = load;

  // Eliminar (solo Gurú, doble confirmación)
  qs('btnDelete').onclick = async () => {
    if (!IS_GURU) { alert('Solo el Gurú puede eliminar'); return; }
    const ids = getSelectedIds();
    if (!ids.length) { alert('Marcá al menos un estudiante.'); return; }
    if (!confirm(`Vas a eliminar ${ids.length} inscripción(es) de este curso. Esta acción no puede deshacerse. ¿Continuar?`)) return;
    const word = prompt('Escribí "ELIMINAR" para confirmar');
    if ((word || '').toUpperCase() !== 'ELIMINAR') { alert('Cancelado.'); return; }
    try {
      await api.post('/estudiantes/eliminar', { course_id: Number(courseId), enrollment_ids: ids, confirm: 'ELIMINAR' });
      await load();
      alert('Eliminación completada.');
    } catch (e) {
      alert(e.message || 'Error al eliminar');
    }
  };

  // Nuevo
  qs('btnNew').onclick = () => {
    ['n_last','n_first','n_email','n_legajo','n_group','n_obs'].forEach(id=>qs(id).value='');
    qs('n_msg').textContent='';
    modalShow('modalNew');
  };
  Array.from(document.querySelectorAll('#modalNew [data-close]')).forEach(b => b.onclick = ()=>modalHide('modalNew'));
  qs('n_save').onclick = async () => {
    qs('n_msg').textContent='';
    try {
      const payload = {
        course_id: Number(courseId),
        last_name: qs('n_last').value.trim(),
        first_name: qs('n_first').value.trim(),
        email_inst: qs('n_email').value.trim(),
        legajo: qs('n_legajo').value.trim(),
        group_number: qs('n_group').value ? Number(qs('n_group').value) : undefined,
        observaciones: qs('n_obs').value.trim()
      };
      const r = await api.post('/estudiantes/guardar', payload);
      qs('n_msg').textContent = `Guardado. ID asignado: ${r.assigned_id}`;
      await load();
      setTimeout(()=>modalHide('modalNew'), 600);
    } catch (e) { qs('n_msg').textContent = e.message || 'Error al guardar'; }
  };

  // CSV
  qs('btnBulk').onclick = () => { qs('b_file').value=''; qs('b_dry').checked=true; qs('b_msg').textContent=''; modalShow('modalBulk'); };
  Array.from(document.querySelectorAll('#modalBulk [data-close]')).forEach(b => b.onclick = ()=>modalHide('modalBulk'));
  qs('b_upload').onclick = async () => {
    const f = qs('b_file').files[0];
    const dry = qs('b_dry').checked ? 1 : 0;
    if (!f) { qs('b_msg').textContent = 'Seleccioná un CSV.'; return; }
    const fd = new FormData(); fd.append('file', f);
    try {
      const res = await fetch(`${API_BASE}/estudiantes/bulk?course_id=${courseId}&dry_run=${dry}`, {
        method:'POST', headers: { Authorization: `Bearer ${api.getToken()}` }, body: fd
      });
      const txt = await res.text(); const data = txt ? JSON.parse(txt) : {};
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      qs('b_msg').textContent = `OK: Insertados=${data.inserted||0}, Actualizados=${data.updated||0}, dry_run=${data.dry_run}. ${data.errors?.length ? 'Errores: '+data.errors.join(' | ') : ''}`;
      if (!dry) { await load(); setTimeout(()=>modalHide('modalBulk'), 800); }
    } catch (e) { qs('b_msg').textContent = e.message || 'Error en carga'; }
  };

  // Reasignar IDs
  qs('btnReid').onclick = async () => {
    if (!confirm('Reasignar IDs por Apellido,Nombre (solo ALTA). ¿Continuar?')) return;
    try { await api.post('/estudiantes/reasignar-ids', { course_id: Number(courseId), scope:'ALTA' }); await load(); alert('Reasignado.'); }
    catch (e) { alert(e.message || 'Error al reasignar'); }
  };

  // Editar (masivo)
  qs('btnEdit').onclick = () => { renderEditTable(DATA); qs('e_msg').textContent=''; modalShow('modalEdit'); };
  Array.from(document.querySelectorAll('#modalEdit [data-close]')).forEach(b => b.onclick = ()=>modalHide('modalEdit'));
  qs('e_save').onclick = async () => {
    qs('e_msg').textContent = 'Guardando cambios...';
    const rows = Array.from(document.querySelectorAll('#editTable tr[data-enr]')).map(tr => {
      const id = Number(tr.dataset.enr);
      const orig = DATA.find(x=>x.id===id);
      const val = (k)=>{ const el = tr.querySelector(`[data-k="${k}"]`); return el ? el.value : undefined; };
      const payload = { course_id:Number(courseId), enrollment_id:id };
      const map = {
        status: val('status'),
        last_name: val('last_name'),
        first_name: val('first_name'),
        legajo: val('legajo'),
        email_inst: val('email_inst'),
        group_number: (val('group_number')===''? null : Number(val('group_number')) ),
        observaciones: val('observaciones')
      };
      for (const [k,v] of Object.entries(map)) {
        const comp = k==='last_name'?orig.apellido:
                     k==='first_name'?orig.nombre:
                     k==='email_inst'? (orig.email_inst||''):
                     k==='legajo'? (orig.legajo||''):
                     k==='status'? orig.status:
                     k==='group_number'? (orig.group_no??null):
                     k==='observaciones'? (orig.observaciones||'') : null;
        if ((v??'') !== (comp??'')) payload[k]=v;
      }
      return payload;
    }).filter(p => Object.keys(p).length>2);

    try {
      for (const p of rows) { await api.post('/estudiantes/editar', p); }
      qs('e_msg').textContent = `Cambios guardados (${rows.length}).`;
      await load();
      setTimeout(()=>modalHide('modalEdit'), 600);
    } catch (e) {
      qs('e_msg').textContent = e.message || 'Error al guardar cambios';
    }
  };

  // init
  await load();
})();
