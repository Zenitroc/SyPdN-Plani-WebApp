renderMenu();

function option(v, t) { return `<option value="${v}">${t}</option>`; }
function qs(id) { return document.getElementById(id); }
function modalShow(id) { qs(id).style.display = 'flex'; }
function modalHide(id) { qs(id).style.display = 'none'; }

let COURSE_ID = null;
let GROUPS = [];
let CAN_EDIT = false;
let CAN_EDIT_CONFORMITY = false;

(async function () {
    if (!api.getToken()) { location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/'); return; }
    const me = await api.get('/me');
    const roles = Array.isArray(me.roles) ? me.roles : [];
    const isGuru = roles.includes('GURU');
    const isSenior = roles.includes('SENIOR');
    const isAyudante = roles.includes('AYUDANTE');
    CAN_EDIT = isGuru || isSenior;
    CAN_EDIT_CONFORMITY = CAN_EDIT || isAyudante;
    if (!CAN_EDIT) {
        const moveField = qs('gm_move_to')?.closest('.field');
        if (moveField) moveField.style.display = 'none';
        if (qs('gm_move')) qs('gm_move').style.display = 'none';
        if (qs('gm_remove')) qs('gm_remove').style.display = 'none';
    }
    COURSE_ID = await courseContext.require();

    // Helpers de UI
    const memberStyle = `
    <style id="group-member-style">
      .member-list{margin-top:.6rem;display:flex;flex-wrap:wrap;gap:.35rem}
      .pill{border:1px solid var(--border);border-radius:999px;padding:.15rem .55rem;font-size:.9rem;
            background:color-mix(in oklab,var(--surface) 85%, var(--bg));}
      .pill small{opacity:.7}
    </style>`;
    if (!document.getElementById('group-member-style')) {
        document.head.insertAdjacentHTML('beforeend', memberStyle);
    }

    async function fetchMembersFor(g) {
        const rows = await api.get(`/grupos/miembros?course_id=${COURSE_ID}&group_number=${g.number}`);
        return rows.map(r => ({
            id: r.enrollment_id,
            courseIdSeq: r.id_en_curso,
            last: r.apellido,
            first: r.nombre,
            legajo: r.legajo || ''
        }));
    }

    async function loadGroups() {
        GROUPS = await api.get(`/grupos?course_id=${COURSE_ID}`);

        // Traer miembros de todos los grupos en paralelo
        const members = await Promise.all(GROUPS.map(g => fetchMembersFor(g)));
        GROUPS = GROUPS.map((g, i) => ({ ...g, _members: members[i] || [] }));

        const cont = qs('groups');
        cont.innerHTML = GROUPS.map(g => {
            const statusClass = g.conformity_submitted ? 'ok' : 'pending';
            const memberChips = g._members.length
                ? `<div class="member-list">
         ${g._members.map(m => `<span class="pill">${m.last}, ${m.first} <small>#${m.courseIdSeq}${m.legajo ? ` · ${m.legajo}` : ''}</small></span>`).join('')}
       </div>`
                : `<div class="small" style="margin-top:.6rem">Sin miembros.</div>`;
            return `
    <div class="group-card ${statusClass}">
      <div style="display:flex;align-items:center;gap:.5rem">
        <div class="badge">#${g.number}</div>
        <b>${g.name ?? ''}</b>
        <div class="spacer"></div>
        <span class="small">${g.conformity_submitted ? 'Conformidad ✔' : 'Sin conformidad ✖'}</span>
        <span class="small" style="margin-left:.5rem">${g.members} miembro(s)</span>
      </div>
      <div style="display:flex;gap:.4rem;margin-top:.6rem;flex-wrap:wrap">
        <button class="btn btn-soft" data-view="${g.number}">Ver miembros</button>
        ${CAN_EDIT_CONFORMITY ? `<button class="btn btn-neutral" data-edit="${g.number}">Editar</button>` : ''}
        ${CAN_EDIT ? `<button class="btn btn-danger" data-del="${g.number}">Eliminar</button>` : ''}
      </div>
      ${memberChips}
    </div>`;
        }).join('');


        // acciones
        cont.querySelectorAll('[data-view]').forEach(b => b.onclick = () => openMembers(Number(b.dataset.view)));
        cont.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEdit(Number(b.dataset.edit)));
        cont.querySelectorAll('[data-del]').forEach(b => b.onclick = () => deleteGroup(Number(b.dataset.del)));

        // llenar selects destino
        const dests = GROUPS.map(g => option(g.number, `Grupo ${g.number}${g.name ? ` — ${g.name}` : ''}`)).join('');
        qs('ga_target').innerHTML = dests;
        qs('gm_move_to').innerHTML = dests;
    }

    async function loadNoGroup() {
        const list = await api.get(`/estudiantes?course_id=${COURSE_ID}`);
        const free = list.filter(x => !x.group_no);
        const c = qs('noGroup');
        if (!free.length) { c.innerHTML = '<div class="small">Todos los alumnos tienen grupo.</div>'; return; }
         const pickCell = (r) => CAN_EDIT
            ? `<input type="checkbox" class="pick-free" data-enrid="${r.id}">`
            : '';
        c.innerHTML = `
      <table class="tbl">
        <tr><th></th><th>ID</th><th>Apellido</th><th>Nombre</th><th>Legajo</th></tr>
        ${free.map(r => `<tr>
            <td>${pickCell(r)}</td>
            <td>${r.course_id_seq}</td><td>${r.apellido}</td><td>${r.nombre}</td><td>${r.legajo ?? ''}</td>
          </tr>`).join('')}
      </table>`;
        qs('ga_list').innerHTML = `${free.length} alumno(s) sin grupo.`;
    }

      // ==== Crear grupo ====
    if (!CAN_EDIT) {
        qs('g_new').style.display = 'none';
        qs('g_assign_open').style.display = 'none';
    }
    qs('g_new').onclick = () => {
        if (!CAN_EDIT) { alert('Sin permisos para crear grupos.'); return; }
        qs('gn_name').value = ''; qs('gn_msg').textContent = ''; modalShow('modalGNew');
    };
    Array.from(document.querySelectorAll('#modalGNew [data-close]')).forEach(b => b.onclick = () => modalHide('modalGNew'));
    qs('gn_save').onclick = async () => {
        if (!CAN_EDIT) { qs('gn_msg').textContent = 'Sin permisos para crear.'; return; }
        try {
            const name = qs('gn_name').value.trim() || null;
            await api.post('/grupos/crear', { course_id: Number(COURSE_ID), name });
            await loadGroups();
            modalHide('modalGNew');
        } catch (e) { qs('gn_msg').textContent = e.message || 'Error al crear'; }
    };

    // ==== Asignar alumnos (desde sin grupo) ====
    qs('g_assign_open').onclick = () => {
        if (!CAN_EDIT) { alert('Sin permisos para asignar miembros.'); return; }
        qs('ga_msg').textContent = ''; modalShow('modalGAssign');
    };
    Array.from(document.querySelectorAll('#modalGAssign [data-close]')).forEach(b => b.onclick = () => modalHide('modalGAssign'));
    qs('ga_apply').onclick = async () => {
        if (!CAN_EDIT) { qs('ga_msg').textContent = 'Sin permisos para asignar.'; return; }
        const groupNumber = Number(qs('ga_target').value);
        const ids = Array.from(document.querySelectorAll('.pick-free:checked')).map(x => Number(x.dataset.enrid));
        if (!groupNumber || ids.length === 0) { qs('ga_msg').textContent = 'Elegí un grupo y marcá alumnos.'; return; }
        try {
            await api.post('/grupos/asignar', { course_id: Number(COURSE_ID), group_number: groupNumber, enrollment_ids: ids });
            await loadNoGroup(); await loadGroups();
            qs('ga_msg').textContent = 'Asignados.';
            setTimeout(() => modalHide('modalGAssign'), 500);
        } catch (e) { qs('ga_msg').textContent = e.message || 'Error al asignar'; }
    };

    // ==== Ver miembros / mover / quitar ====
    async function openMembers(number) {
        const title = GROUPS.find(g => g.number === number);
        qs('gm_title').textContent = `Miembros — Grupo ${number}${title?.name ? ` — ${title.name}` : ''}`;
        qs('gm_msg').textContent = '';
        const rows = await api.get(`/grupos/miembros?course_id=${COURSE_ID}&group_number=${number}`);
        qs('gm_table').innerHTML = rows.length
            ? `<table class="tbl">
          <tr><th></th><th>ID</th><th>Apellido</th><th>Nombre</th><th>Legajo</th></tr>
          ${rows.map(r => `<tr>
              <td>${CAN_EDIT ? `<input type="checkbox" class="pick-mem" data-enrid="${r.enrollment_id}">` : ''}</td>
              <td>${r.id_en_curso}</td><td>${r.apellido}</td><td>${r.nombre}</td><td>${r.legajo ?? ''}</td>
            </tr>`).join('')}
        </table>`
            : '<div class="small">Sin miembros.</div>';
        qs('modalMembers').dataset.groupNumber = String(number);
        modalShow('modalMembers');
    }
    Array.from(document.querySelectorAll('#modalMembers [data-close]')).forEach(b => b.onclick = () => modalHide('modalMembers'));
    qs('gm_move').onclick = async () => {
        if (!CAN_EDIT) { qs('gm_msg').textContent = 'Sin permisos para mover.'; return; }
        const from = Number(qs('modalMembers').dataset.groupNumber);
        const to = Number(qs('gm_move_to').value);
        const ids = Array.from(document.querySelectorAll('.pick-mem:checked')).map(x => Number(x.dataset.enrid));
        if (!to || ids.length === 0) { qs('gm_msg').textContent = 'Elegí destino y marcá alumnos.'; return; }
        try {
            await api.post('/grupos/asignar', { course_id: Number(COURSE_ID), group_number: to, enrollment_ids: ids });
            qs('gm_msg').textContent = 'Movidos.';
            await openMembers(from); await loadGroups(); await loadNoGroup();
        } catch (e) { qs('gm_msg').textContent = e.message || 'Error al mover'; }
    };
    qs('gm_remove').onclick = async () => {
        if (!CAN_EDIT) { qs('gm_msg').textContent = 'Sin permisos para quitar.'; return; }
        const from = Number(qs('modalMembers').dataset.groupNumber);
        const ids = Array.from(document.querySelectorAll('.pick-mem:checked')).map(x => Number(x.dataset.enrid));
        if (ids.length === 0) { qs('gm_msg').textContent = 'Marcá alumnos.'; return; }
        try {
            await api.post('/grupos/asignar', { course_id: Number(COURSE_ID), group_number: null, enrollment_ids: ids });
            qs('gm_msg').textContent = 'Quitados del grupo.';
            await openMembers(from); await loadGroups(); await loadNoGroup();
        } catch (e) { qs('gm_msg').textContent = e.message || 'Error'; }
    };

    // ==== Editar grupo (nombre + conformidad) / eliminar ====
    async function openEdit(number) {
        const g = GROUPS.find(x => x.number === number);
        qs('ge_title').textContent = `Editar grupo #${number}`;
        qs('ge_name').value = g?.name ?? '';
        qs('ge_conf').checked = !!g?.conformity_submitted;
        qs('ge_msg').textContent = '';
        qs('modalGEdit').dataset.groupNumber = String(number);
        if (!CAN_EDIT) {
            qs('ge_name').disabled = true;
            qs('ge_delete').style.display = 'none';
        } else {
            qs('ge_name').disabled = false;
            qs('ge_delete').style.display = 'inline-flex';
        }
        if (!CAN_EDIT_CONFORMITY) {
            qs('ge_conf').disabled = true;
        } else {
            qs('ge_conf').disabled = false;
        }
        modalShow('modalGEdit');
    }
    Array.from(document.querySelectorAll('#modalGEdit [data-close]')).forEach(b => b.onclick = () => modalHide('modalGEdit'));
    qs('ge_save').onclick = async () => {
        if (!CAN_EDIT_CONFORMITY) { qs('ge_msg').textContent = 'Sin permisos para guardar.'; return; }
        const number = Number(qs('modalGEdit').dataset.groupNumber);
        try {
            const payload = {
                course_id: Number(COURSE_ID),
                group_number: number,
                conformity_submitted: qs('ge_conf').checked ? 1 : 0
            };
            if (CAN_EDIT) {
                payload.name = qs('ge_name').value.trim() || null;
            }
            await api.post('/grupos/editar', payload);
            await loadGroups();
            modalHide('modalGEdit');
        } catch (e) { qs('ge_msg').textContent = e.message || 'Error al guardar'; }
    };
    async function deleteGroup(number) {
        if (!CAN_EDIT) { alert('Sin permisos para eliminar.'); return; }
        if (!confirm(`Eliminar grupo #${number}? Sus miembros quedarán sin grupo.`)) return;
        try { await api.post('/grupos/eliminar', { course_id: Number(COURSE_ID), group_number: number }); await loadGroups(); await loadNoGroup(); }
        catch (e) { alert(e.message || 'Error al eliminar'); }
    }
    qs('ge_delete').onclick = async () => {
        const number = Number(qs('modalGEdit').dataset.groupNumber);
        await deleteGroup(number);
        modalHide('modalGEdit');
    };

    // Botón actualizar
    qs('g_refresh_top').onclick = async () => { await loadGroups(); await loadNoGroup(); };

    // init
    await loadGroups();
    await loadNoGroup();
})();
