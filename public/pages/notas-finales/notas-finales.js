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
    let SHOW = 'ALL';
    let ATT = 'ALL';
    let TOPIC_FILTER = 'ALL';
    let SCROLL_SYNC_READY = false;

    const MAP_P1 = { ORG: 'O', MET: 'M', TEO1: 'T' };
    const MAP_P2 = { PLS: 'P', CUR: 'C', TEO2: 'T' };
    const FAIL = new Set(['A', 'N_E', 'NO_SAT', 'N_S']);
    const ATT_LABEL = { PA: 'PARC', '1R': '1R', '2R': '2R' };
    const ALL_ATTEMPTS = ['PA', '1R', '2R'];
    const DEFAULT_TOPICS = { p1: ['ORG', 'MET', 'TEO1'], p2: ['PLS', 'CUR', 'TEO2'] };
    const CONDITION_LABELS = {
        DESERTO: { text: 'DESERTÓ', cls: 'deserto' },
        RECURSA: { text: 'RECURSA', cls: 'recursa' },
        FIRMA: { text: 'FIRMA', cls: 'firma' },
        PROMOCIONA: { text: 'PROMOCIONA', cls: 'promociona' }
    };

    const isBlank = (c) => c == null || String(c).trim() === '';
    const pass = (c) => !!c && !FAIL.has(String(c).toUpperCase());

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
        if (row.final_condition && CONDITION_LABELS[row.final_condition]) {
            return CONDITION_LABELS[row.final_condition];
        }
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

    function filteredBase() {
        let list = DATA.students || [];
        if (STATUS_FILTER === 'ALTA') list = list.filter(x => x.status === 'ALTA');
        if (STATUS_FILTER === 'BAJA') list = list.filter(x => x.status === 'BAJA');
        if (QUERY) {
            list = list.filter(r => String(r.apellido || '').toLowerCase().includes(QUERY) || String(r.nombre || '').toLowerCase().includes(QUERY));
        }
        return list;
    }

    function filteredFinals() {
        let list = filteredBase();
        if (SIU_FILTER === 'LOADED') list = list.filter(x => Number(x.siu_loaded) === 1);
        if (SIU_FILTER === 'UNLOADED') list = list.filter(x => Number(x.siu_loaded) !== 1);
        return list;
    }

    const topicData = () => (DATA.topics && typeof DATA.topics === 'object') ? DATA.topics : DEFAULT_TOPICS;
    const allTopics = () => {
        const topics = topicData();
        return Array.from(new Set([...(topics.p1 || []), ...(topics.p2 || [])]));
    };

    function topicsForShow() {
        const topics = topicData();
        if (TOPIC_FILTER !== 'ALL') {
            if ((topics.p1 || []).includes(TOPIC_FILTER)) return { p1: [TOPIC_FILTER], p2: [] };
            if ((topics.p2 || []).includes(TOPIC_FILTER)) return { p1: [], p2: [TOPIC_FILTER] };
            return { p1: [TOPIC_FILTER], p2: [] };
        }
        if (SHOW === 'P1') return { p1: topics.p1 || [], p2: [] };
        if (SHOW === 'P2') return { p1: [], p2: topics.p2 || [] };
        return { p1: topics.p1 || [], p2: topics.p2 || [] };
    }

    function attemptsShown() {
        if (ATT === 'ALL') return ['PA', '1R', '2R'];
        if (ATT === 'REC') return ['1R', '2R'];
        return [ATT];
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
        renderTopicOptions();
        renderTables();
    }

    function renderTables() {
        renderFinalsTable();
        renderPartialTable();
        setupScrollSync();
    }

    function renderFinalsTable() {
        const rows = filteredFinals();
        const body = qs('tbodyFinals');
        const head = qs('finalsHead');
        const topics = topicData();
        const attempts = ALL_ATTEMPTS;
        const finalsTopics = {
            p1: topics.p1 || [],
            p2: topics.p2 || []
        };
        const headerCells = [
            '<th class="center sticky-col-1">ID</th>',
            '<th class="sticky-col-2">Apellido</th>',
            '<th class="sticky-col-3">Nombre</th>',
            '<th class="center">1°P</th>',
            '<th class="center">2°P</th>',
            ...[...finalsTopics.p1, ...finalsTopics.p2].flatMap(topic =>
                attempts.map(a => `<th class="tiny">${topic}_${ATT_LABEL[a]}</th>`)
            ),
            '<th class="center">TPS 1C</th>',
            '<th class="center">TPS 2C</th>',
            '<th class="center">Calificación final</th>',
            '<th class="center">Condición</th>',
            '<th class="center">Cargado en SIU</th>',
            '<th>Observaciones</th>'
        ];
        head.innerHTML = `<tr>${headerCells.join('')}</tr>`;
        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="${headerCells.length}" class="muted">Sin estudiantes</td></tr>`;
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
            const partialCells = [];
            finalsTopics.p1.forEach(topic => attempts.forEach(a => {
                partialCells.push(`<td class="tiny">${escapeHtml(row.p1?.[topic]?.[a] ?? '-')}</td>`);
            }));
            finalsTopics.p2.forEach(topic => attempts.forEach(a => {
                partialCells.push(`<td class="tiny">${escapeHtml(row.p2?.[topic]?.[a] ?? '-')}</td>`);
            }));

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
        <td class="center sticky-col-1">${row.course_id_seq}</td>
        <td class="sticky-col-2">${apellido}</td>
        <td class="sticky-col-3">${nombre}</td>
        <td class="center">${p1}</td>
        <td class="center">${p2}</td>
        ${partialCells.join('')}
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

    function renderTopicOptions() {
        const select = qs('topicFilter');
        if (!select) return;
        const topics = allTopics();
        if (TOPIC_FILTER !== 'ALL' && !topics.includes(TOPIC_FILTER)) {
            TOPIC_FILTER = 'ALL';
        }
        select.innerHTML = ['<option value="ALL">Todos</option>']
            .concat(topics.map(t => `<option value="${t}"${t === TOPIC_FILTER ? ' selected' : ''}>${t}</option>`))
            .join('');
    }

    function headPartialTable() {
        const atts = attemptsShown();
        const { p1, p2 } = topicsForShow();
        const base = `
      <tr>
        <th class="sticky-col-1">ID</th>
        <th class="sticky-col-2">Apellido</th>
        <th class="sticky-col-3">Nombre</th>
        <th>1°P</th>
        <th>2°P</th>
        ${[...p1, ...p2].map(topic => atts.map(a => `<th class="tiny">${topic}_${ATT_LABEL[a]}</th>`).join('')).join('')}
      </tr>`;
        return base;
    }

    function cellClassFromGrade(code) {
        if (isBlank(code)) return '';
        return FAIL.has(String(code).toUpperCase()) ? 'td-fail' : 'td-pass';
    }

    function renderPartialRow(row) {
        const atts = attemptsShown();
        const { p1, p2 } = topicsForShow();
        const p1AP = !row.adeuda_p1 || row.adeuda_p1.length === 0;
        const p2AP = !row.adeuda_p2 || row.adeuda_p2.length === 0;

        const hasAnyPass = (p, t) => ALL_ATTEMPTS.some(a => pass(row[p]?.[t]?.[a]));
        const gradeCell = (p, t, a) => {
            const value = row[p]?.[t]?.[a] ?? '';
            const gClass = cellClassFromGrade(value);
            const topicPassClass = !gClass && hasAnyPass(p, t) ? 'td-topic-pass' : '';
            const tdClass = ['tiny', gClass, topicPassClass].filter(Boolean).join(' ');
            return `<td class="${tdClass}">${escapeHtml(value || '-')}</td>`;
        };

        const cells = [];
        p1.forEach(topic => atts.forEach(a => cells.push(gradeCell('p1', topic, a))));
        p2.forEach(topic => atts.forEach(a => cells.push(gradeCell('p2', topic, a))));

        return `
      <tr>
        <td class="sticky-col-1">${row.course_id_seq}</td>
        <td class="text-left sticky-col-2">${escapeHtml(row.apellido)}</td>
        <td class="text-left sticky-col-3">${escapeHtml(row.nombre)}</td>
        <td>${p1AP ? '<span class="txt-ok">AP</span>' : `<span class="txt-bad">${row.adeuda_p1.map(t => MAP_P1[t] || t).join('-')}</span>`}</td>
        <td>${p2AP ? '<span class="txt-ok">AP</span>' : `<span class="txt-bad">${row.adeuda_p2.map(t => MAP_P2[t] || t).join('-')}</span>`}</td>
        ${cells.join('')}
      </tr>`;
    }

    function renderPartialTable() {
        const rows = filteredBase();
        const head = qs('partialsHead');
        const body = qs('partialsBody');
        head.innerHTML = headPartialTable();
        if (!rows.length) {
            const colCount = head.querySelectorAll('th').length || 8;
            body.innerHTML = `<tr><td colspan="${colCount}" class="muted">Sin estudiantes</td></tr>`;
            return;
        }

        body.innerHTML = rows.map(renderPartialRow).join('');
    }

    function setupScrollSync() {
        document.querySelectorAll('.table-scroll').forEach(scrollbar => {
            const targetId = scrollbar.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (!target) return;
            const inner = scrollbar.querySelector('.table-scroll-inner');
            const syncSize = () => {
                inner.style.width = `${target.scrollWidth}px`;
            };
            const syncFromTop = () => {
                target.scrollLeft = scrollbar.scrollLeft;
            };
            const syncFromBody = () => {
                scrollbar.scrollLeft = target.scrollLeft;
            };
            if (!SCROLL_SYNC_READY) {
                scrollbar.addEventListener('scroll', syncFromTop);
                target.addEventListener('scroll', syncFromBody);
                window.addEventListener('resize', syncSize);
            }
            syncSize();
            syncFromBody();
        });
        SCROLL_SYNC_READY = true;
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
                let nextCondition = null;
                if (payload.final_deserto === 1) nextCondition = 'DESERTO';
                else if (payload.final_grade == null) nextCondition = null;
                else if (payload.final_grade < 6) nextCondition = 'RECURSA';
                else if (payload.final_grade < 8) nextCondition = 'FIRMA';
                else nextCondition = 'PROMOCIONA';
                updateRow(enrollmentId, {
                    final_deserto: payload.final_deserto,
                    final_grade: payload.final_grade,
                    final_condition: nextCondition
                });
                renderTables();
            });
        });

        qs('tbodyFinals').querySelectorAll('input.siu-check').forEach(chk => {
            chk.addEventListener('change', async (ev) => {
                const target = ev.currentTarget;
                const enrollmentId = Number(target.getAttribute('data-enroll'));
                const siuLoaded = target.checked ? 1 : 0;
                await apiPost('/guardar', { course_id: COURSE_ID, enrollment_id: enrollmentId, siu_loaded: siuLoaded });
                updateRow(enrollmentId, { siu_loaded: siuLoaded });
                renderTables();
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
                renderTables();
            });
        });
    }

    qs('statusFilter').addEventListener('change', e => { STATUS_FILTER = e.target.value; renderTables(); });
    qs('siuFilter').addEventListener('change', e => { SIU_FILTER = e.target.value; renderTables(); });
    qs('showCols').addEventListener('change', e => { SHOW = e.target.value; renderPartialTable(); });
    qs('attemptFilter').addEventListener('change', e => { ATT = e.target.value; renderPartialTable(); });
    qs('topicFilter').addEventListener('change', e => { TOPIC_FILTER = e.target.value; renderPartialTable(); });
    (function () {
        let t = null;
        qs('q').addEventListener('input', e => {
            clearTimeout(t);
            t = setTimeout(() => {
                QUERY = e.target.value.trim().toLowerCase();
                renderTables();
            }, 160);
        });
    })();

    const btnDownloadPdf = qs('btnDownloadPdf');
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', () => downloadPdf());
    }

    function parcialPlain(adeuda, p) {
        if (!adeuda || adeuda.length === 0) return 'AP';
        const map = p === 1 ? MAP_P1 : MAP_P2;
        return adeuda.map(t => map[t] || t).join('-');
    }

    function downloadPdf() {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            alert('No se pudo cargar la librería de PDF.');
            return;
        }
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text('Notas finales', 14, 14);

        const finalsRows = filteredFinals().map(row => {
            const cond = conditionInfo(row);
            return [
                row.course_id_seq,
                row.apellido,
                row.nombre,
                parcialPlain(row.adeuda_p1, 1),
                parcialPlain(row.adeuda_p2, 2),
                row.tps_1c == null ? '-' : `${row.tps_1c}%`,
                row.tps_2c == null ? '-' : `${row.tps_2c}%`,
                row.final_deserto ? 'Desertó' : (row.final_grade ?? '-'),
                cond.text || '-',
                Number(row.siu_loaded) === 1 ? 'Sí' : 'No',
                row.observaciones || ''
            ];
        });
        doc.autoTable({
            startY: 20,
            head: [[
                'ID', 'Apellido', 'Nombre', '1°P', '2°P', 'TPS 1C', 'TPS 2C',
                'Final', 'Condición', 'SIU', 'Observaciones'
            ]],
            body: finalsRows
        });

        const partialsRows = filteredBase().map(row => {
            const atts = attemptsShown();
            const { p1, p2 } = topicsForShow();
            const base = [
                row.course_id_seq,
                row.apellido,
                row.nombre,
                parcialPlain(row.adeuda_p1, 1),
                parcialPlain(row.adeuda_p2, 2)
            ];
            p1.forEach(topic => atts.forEach(a => base.push(row.p1?.[topic]?.[a] ?? '')));
            p2.forEach(topic => atts.forEach(a => base.push(row.p2?.[topic]?.[a] ?? '')));
            return base;
        });

        const partialHeaders = (() => {
            const atts = attemptsShown();
            const { p1, p2 } = topicsForShow();
            const cols = ['ID', 'Apellido', 'Nombre', '1°P', '2°P'];
            [...p1, ...p2].forEach(topic => atts.forEach(a => cols.push(`${topic}_${ATT_LABEL[a]}`)));
            return cols;
        })();

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [partialHeaders],
            body: partialsRows
        });

        doc.save('notas-finales.pdf');
    }

    load().catch(e => {
        const head = qs('finalsHead');
        const colCount = head ? head.querySelectorAll('th').length : 11;
        qs('tbodyFinals').innerHTML = `<tr><td colspan="${colCount}" style="padding:1rem">Error: ${e.message || e}</td></tr>`;
    });
})();