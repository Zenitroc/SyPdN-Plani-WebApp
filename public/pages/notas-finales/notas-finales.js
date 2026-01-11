renderMenu();

(function () {
    const qs = (id) => document.getElementById(id);
    const payload = (r) => (r && typeof r === 'object' && 'data' in r) ? r.data : r;

    const API_BASES = ['/api/notas-finales', '/notas-finales'];
    let apiBaseIdx = 0;
    const nf = (v) => String(v?.message || v?.error || v || '').toLowerCase().includes('not found');
    const apiGet = async (p) => { try { const r = await api.get(API_BASES[apiBaseIdx] + p); if (r?.error && nf(r)) throw 0; return r; } catch { apiBaseIdx = 1; return api.get(API_BASES[1] + p); } };
    const apiPost = async (p, b) => { try { const r = await api.post(API_BASES[apiBaseIdx] + p, b); if (r?.error && nf(r)) throw 0; return r; } catch { apiBaseIdx = 1; return api.post(API_BASES[1] + p, b); } };

    let COURSE_ID = null;
    let DATA = { students: [] };
    let CAN_EDIT = false;
    let IS_GURU = false;
    let STATUS_FILTER = 'ALL';
    let SIU_FILTER = 'ALL';
    let QUERY = '';

    const MAP_P1 = { ORG: 'O', MET: 'M', TEO1: 'T' };
    const MAP_P2 = { PLS: 'P', CUR: 'C', TEO2: 'T' };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }

    function parcialText(adeuda, p) {
        if (!adeuda || adeuda.length === 0) return `<span class="txt-ok">AP</span>`;
        const map = p === 1 ? MAP_P1 : MAP_P2;
        return `<span class="txt-bad">${adeuda.map(t => map[t] || t).join('-')}</span>`;
    }

    function conditionInfo(row) {
        if (row.final_deserto) return { text: 'DESERTÓ', cls: 'deserto' };
        if (row.final_grade == null) return { text: '-', cls: '' };
        const grade = Number(row.final_grade);
        if (grade < 6) return { text: 'RECURSA', cls: 'recursa' };
        if (grade < 8) return { text: 'FIRMA', cls: 'firma' };
        return { text: 'PROMOCIONA', cls: 'promociona' };
    }

    function finalGradeOptions(value, deserto) {
        const selected = deserto ? 'DESERTO' : (value != null ? String(value) : '');
        const base = [
            { value: '', label: '' },
            { value: 'DESERTO', label: 'Desertó' },
            ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
        ];
        return base.map(opt => `<option value="${opt.value}"${opt.value === selected ? ' selected' : ''}>${opt.label}</option>`).join('');
    }

    function filtered() {
        let list = DATA.students || [];
        if (STATUS_FILTER === 'ALTA') list = list.filter(x => x.status === 'ALTA');
        if (STATUS_FILTER === 'BAJA') list = list.filter(x => x.status === 'BAJA');
        if (SIU_FILTER === 'LOADED') list = list.filter(x => Number(x.siu_loaded) === 1);
        if (SIU_FILTER === 'UNLOADED') list = list.filter(x => Number(x.siu_loaded) !== 1);
        if (QUERY) {
            list = list.filter(r => String(r.apellido || '').toLowerCase().includes(QUERY) || String(r.nombre || '').toLowerCase().includes(QUERY));
        }
        return list;
    }

    async function ensurePermissions() {
        const me = await api.get('/me');
        const roles = Array.isArray(me.roles) ? me.roles : [];
        CAN_EDIT = roles.includes('GURU') || roles.includes('SENIOR');
        IS_GURU = roles.includes('GURU');
    }

    async function load() {
        await ensurePermissions();
        if (!api.getToken()) {
            location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/');
            return;
        }

        COURSE_ID = Number(await courseContext.require());
        if (!Number.isFinite(COURSE_ID) || COURSE_ID <= 0) throw new Error('No hay curso seleccionado');

        const res = payload(await apiGet(`?course_id=${COURSE_ID}`));
        DATA = res || DATA;
        renderTable();
    }

    function renderTable() {
        const rows = filtered();
        const body = qs('tbodyFinals');
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="11" class="muted">Sin estudiantes</td></tr>';
            return;
        }

        body.innerHTML = rows.map(row => {
            const p1 = parcialText(row.adeuda_p1, 1);
            const p2 = parcialText(row.adeuda_p2, 2);
            const tps1 = row.tps_1c == null ? '<span class="muted-cell">-</span>' : `${row.tps_1c}%`;
            const tps2 = row.tps_2c == null ? '<span class="muted-cell">-</span>' : `${row.tps_2c}%`;
            const cond = conditionInfo(row);
            const rowClass = Number(row.siu_loaded) === 1 ? 'row-siu' : '';
            const apellido = escapeHtml(row.apellido);
            const nombre = escapeHtml(row.nombre);

            const finalCell = CAN_EDIT
                ? `<select class="input final-grade" data-enroll="${row.enrollment_id}">${finalGradeOptions(row.final_grade, row.final_deserto)}</select>`
                : `<span>${row.final_deserto ? 'Desertó' : (row.final_grade ?? '-')}</span>`;

            const siuCell = IS_GURU
                ? `<input type="checkbox" class="siu-check" data-enroll="${row.enrollment_id}" ${Number(row.siu_loaded) === 1 ? 'checked' : ''}>`
                : `<span class="muted-cell">${Number(row.siu_loaded) === 1 ? 'Sí' : '-'}</span>`;

            const obsValue = row.observaciones ?? '';
            const obsEscaped = escapeHtml(obsValue);
            const obsCell = CAN_EDIT
                ? `<input class="input obs-input" data-enroll="${row.enrollment_id}" value="${obsEscaped}" data-original="${obsEscaped}">`
                : `<span>${obsEscaped || '-'}</span>`;

            return `
      <tr class="${rowClass}">
        <td class="center">${row.course_id_seq}</td>
        <td>${apellido}</td>
        <td>${nombre}</td>
        <td class="center">${p1}</td>
        <td class="center">${p2}</td>
        <td class="center">${tps1}</td>
        <td class="center">${tps2}</td>
        <td class="center">${finalCell}</td>
        <td class="center">${cond.cls ? `<span class="badge ${cond.cls}">${cond.text}</span>` : cond.text}</td>
        <td class="center">${siuCell}</td>
        <td>${obsCell}</td>
      </tr>`;
        }).join('');

        bindRowListeners();
    }

    function updateRow(enrollmentId, changes) {
        const row = DATA.students.find(r => Number(r.enrollment_id) === Number(enrollmentId));
        if (!row) return;
        Object.assign(row, changes);
    }

    function bindRowListeners() {
        qs('tbodyFinals').querySelectorAll('select.final-grade').forEach(sel => {
            if (!CAN_EDIT) {
                sel.disabled = true;
                return;
            }
            sel.addEventListener('change', async (ev) => {
                const target = ev.currentTarget;
                const enrollmentId = Number(target.getAttribute('data-enroll'));
                const value = target.value;
                const payload = { course_id: COURSE_ID, enrollment_id: enrollmentId };
                if (value === 'DESERTO') {
                    payload.final_deserto = 1;
                    payload.final_grade = null;
                } else if (value === '') {
                    payload.final_deserto = 0;
                    payload.final_grade = null;
                } else {
                    payload.final_deserto = 0;
                    payload.final_grade = Number(value);
                }
                await apiPost('/guardar', payload);
                updateRow(enrollmentId, {
                    final_deserto: payload.final_deserto,
                    final_grade: payload.final_grade
                });
                renderTable();
            });
        });

        qs('tbodyFinals').querySelectorAll('input.siu-check').forEach(chk => {
            chk.addEventListener('change', async (ev) => {
                const target = ev.currentTarget;
                const enrollmentId = Number(target.getAttribute('data-enroll'));
                const siuLoaded = target.checked ? 1 : 0;
                await apiPost('/guardar', { course_id: COURSE_ID, enrollment_id: enrollmentId, siu_loaded: siuLoaded });
                updateRow(enrollmentId, { siu_loaded: siuLoaded });
                renderTable();
            });
        });

        qs('tbodyFinals').querySelectorAll('input.obs-input').forEach(input => {
            if (!CAN_EDIT) {
                input.disabled = true;
                return;
            }
            input.addEventListener('change', async (ev) => {
                const target = ev.currentTarget;
                const enrollmentId = Number(target.getAttribute('data-enroll'));
                const value = target.value.trim();
                const original = target.getAttribute('data-original') || '';
                if (value === original) return;
                await api.post('/estudiantes/editar', { course_id: COURSE_ID, enrollment_id: enrollmentId, observaciones: value });
                updateRow(enrollmentId, { observaciones: value });
                target.setAttribute('data-original', value);
                renderTable();
            });
        });
    }

    qs('statusFilter').addEventListener('change', e => { STATUS_FILTER = e.target.value; renderTable(); });
    qs('siuFilter').addEventListener('change', e => { SIU_FILTER = e.target.value; renderTable(); });
    (function () {
        let t = null;
        qs('q').addEventListener('input', e => {
            clearTimeout(t);
            t = setTimeout(() => {
                QUERY = e.target.value.trim().toLowerCase();
                renderTable();
            }, 160);
        });
    })();

    load().catch(e => {
        qs('tbodyFinals').innerHTML = `<tr><td colspan="11" style="padding:1rem">Error: ${e.message || e}</td></tr>`;
    });
})();