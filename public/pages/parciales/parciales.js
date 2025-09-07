renderMenu();

(function () {
    const qs = (id) => document.getElementById(id);
    const payload = (r) => (r && typeof r === 'object' && 'data' in r) ? r.data : r;

    // API fallback
    const API_BASES = ['/api/parciales', '/parciales'];
    let apiBaseIdx = 0;
    const nf = (v) => String(v?.message || v?.error || v || '').toLowerCase().includes('not found');
    const apiGet = async (p) => { try { const r = await api.get(API_BASES[apiBaseIdx] + p); if (r?.error && nf(r)) throw 0; return r; } catch { apiBaseIdx = 1; return api.get(API_BASES[1] + p); } };
    const apiPost = async (p, b) => { try { const r = await api.post(API_BASES[apiBaseIdx] + p, b); if (r?.error && nf(r)) throw 0; return r; } catch { apiBaseIdx = 1; return api.post(API_BASES[1] + p, b); } };

    let COURSE_ID = null, DATA = { students: [], grade_options: [] };
    let STATUS_FILTER = 'ALL', SHOW = 'ALL', ATT = 'ALL', QUERY = '';

    // Coloreo
    const FAIL = new Set(['A', 'N_E', 'NO_SAT', 'N_S']);
    const isBlank = (c) => c == null || String(c).trim() === '';
    const pass = (c) => !!c && !FAIL.has(String(c).toUpperCase());

    // 1ºP/2ºP: letras de lo adeudado; si nada => AP
    const MAP_P1 = { ORG: 'O', MET: 'M', TEO1: 'T' };
    const MAP_P2 = { PLS: 'P', CUR: 'C', TEO2: 'T' };
    function parcialText(adeuda, p) {
        if (!adeuda || adeuda.length === 0) return `<span class="txt-ok">AP</span>`;
        const map = p === 1 ? MAP_P1 : MAP_P2;
        return `<span class="txt-bad">${adeuda.map(t => map[t] || t).join('-')}</span>`;
    }

    const OPTS = () => [''].concat(DATA.grade_options || []);
    const optHTML = (v) => OPTS().map(x => `<option value="${x}"${x === v ? ' selected' : ''}>${x}</option>`).join('');
    const matchQ = (r) => !QUERY || (String(r.apellido || '').toLowerCase().includes(QUERY) || String(r.nombre || '').toLowerCase().includes(QUERY));

    function filtered() {
        let list = DATA.students;
        if (STATUS_FILTER === 'ALTA') list = list.filter(x => x.status === 'ALTA');
        if (STATUS_FILTER === 'BAJA') list = list.filter(x => x.status === 'BAJA');
        return list.filter(matchQ);
    }

    function attemptsShown() {
        if (ATT === 'ALL') return ['PA', '1R', '2R'];
        if (ATT === 'REC') return ['1R', '2R'];
        return [ATT];
    }

    async function load() {
        COURSE_ID = await courseContext.require();
        const keepX = qs('rightWrap').scrollLeft;
        const res = payload(await apiGet(`?course_id=${COURSE_ID}`));
        DATA = res || DATA;
        renderTables();
        qs('rightWrap').scrollLeft = keepX;
        ensureLeftWidths();   // << calcula 1 sola vez
        syncRowHeights();
    }

    // =================== Render Tablas ===================
    const ATT_LABEL = { PA: 'PARC', '1R': '1R', '2R': '2R' };

    function headRight() {
        const atts = attemptsShown();
        if (SHOW === 'P1') {
            return `<tr>${atts.map(a => `
      <th class="tone-org">ORG_${ATT_LABEL[a]}</th>
      <th class="tone-met">MET_${ATT_LABEL[a]}</th>
      <th class="tone-teo">TEO1_${ATT_LABEL[a]}</th>`).join('')}</tr>`;
        }
        if (SHOW === 'P2') {
            return `<tr>${atts.map(a => `
      <th class="tone-pls">PLS_${ATT_LABEL[a]}</th>
      <th class="tone-cur">CUR_${ATT_LABEL[a]}</th>
      <th class="tone-teo2">TEO2_${ATT_LABEL[a]}</th>`).join('')}</tr>`;
        }
        // ALL
        return `<tr>
    ${atts.map(a => `
      <th class="tone-org">ORG_${ATT_LABEL[a]}</th>
      <th class="tone-met">MET_${ATT_LABEL[a]}</th>
      <th class="tone-teo">TEO1_${ATT_LABEL[a]}</th>`).join('')}
    ${atts.map(a => `
      <th class="tone-pls">PLS_${ATT_LABEL[a]}</th>
      <th class="tone-cur">CUR_${ATT_LABEL[a]}</th>
      <th class="tone-teo2">TEO2_${ATT_LABEL[a]}</th>`).join('')}
  </tr>`;
    }

    function rowLeft(r) {
        const p1 = parcialText(r.adeuda_p1, 1);
        const p2 = parcialText(r.adeuda_p2, 2);
        return `<tr data-row>
      <td class="c-id">${r.course_id_seq}</td>
      <td class="c-ape">${r.apellido}</td>
      <td class="c-nom">${r.nombre}</td>
      <td class="c-leg">${r.legajo ?? ''}</td>
      <td class="c-p1">${p1}</td>
      <td class="c-p2">${p2}</td>
    </tr>`;
    }

    function cellClassFromGrade(code) {
        if (isBlank(code)) return '';
        return FAIL.has(String(code).toUpperCase()) ? 'td-fail' : 'td-pass';
    }

    function rowRight(r) {
        const atts = attemptsShown();
        const p1AP = !r.adeuda_p1 || r.adeuda_p1.length === 0;
        const p2AP = !r.adeuda_p2 || r.adeuda_p2.length === 0;

        const sel = (p, t, a) => {
            const v = (r[p][t][a] || '');
            const gClass = cellClassFromGrade(v);
            const apClass = (p === 'p1' && p1AP) || (p === 'p2' && p2AP) ? 'td-partial-ap' : '';
            const sClass = gClass === 'td-fail' ? 'fail' : (gClass === 'td-pass' ? 'pass' : '');
            return `<td class="${apClass || gClass}"><select class="score ${sClass}" data-enroll="${r.enrollment_id}" data-partial="${p === 'p1' ? 1 : 2}" data-topic="${t}" data-attempt="${a}">${optHTML(v)}</select></td>`;
        };

        if (SHOW === 'P1') {
            return `<tr data-row>${atts.map(a => sel('p1', 'ORG', a) + sel('p1', 'MET', a) + sel('p1', 'TEO1', a)).join('')}</tr>`;
        }
        if (SHOW === 'P2') {
            return `<tr data-row>${atts.map(a => sel('p2', 'PLS', a) + sel('p2', 'CUR', a) + sel('p2', 'TEO2', a)).join('')}</tr>`;
        }
        return `<tr data-row>${atts.map(a => sel('p1', 'ORG', a) + sel('p1', 'MET', a) + sel('p1', 'TEO1', a)).join('') +
            atts.map(a => sel('p2', 'PLS', a) + sel('p2', 'CUR', a) + sel('p2', 'TEO2', a)).join('')
            }</tr>`;
    }

    function renderTables() {
        const st = filtered();
        qs('tbodyLeft').innerHTML = st.map(rowLeft).join('') || `<tr><td colspan="6" class="muted">Sin estudiantes</td></tr>`;
        qs('theadRight').innerHTML = headRight();
        qs('tbodyRight').innerHTML = st.map(rowRight).join('') || `<tr><td class="muted">Sin datos</td></tr>`;

        // Guardar sin “recalcular anchos”
        qs('tbodyRight').querySelectorAll('select.score').forEach(s => {
            s.addEventListener('change', async (ev) => {
                const t = ev.currentTarget, keepX = qs('rightWrap').scrollLeft;
                const enrollment_id = parseInt(t.getAttribute('data-enroll'), 10);
                const partial = parseInt(t.getAttribute('data-partial'), 10);
                const topic = t.getAttribute('data-topic');
                const attempt = t.getAttribute('data-attempt');
                const grade_code = t.value || null;

                // feedback instantáneo y sin reflujo
                t.classList.remove('pass', 'fail');
                const td = t.closest('td'); td.classList.remove('td-pass', 'td-fail');
                if (!isBlank(grade_code)) {
                    if (FAIL.has(String(grade_code).toUpperCase())) { t.classList.add('fail'); td.classList.add('td-fail'); }
                    else { t.classList.add('pass'); td.classList.add('td-pass'); }
                }

                try {
                    await apiPost('/guardar', { course_id: COURSE_ID, enrollment_id, partial, topic, attempt, grade_code });
                } finally {
                    // recargo datos y repinto, PERO sin medir anchos (se quedan fijos)
                    await reloadWithoutMeasuring();
                    qs('rightWrap').scrollLeft = keepX;
                }
            });
        });
    }

    // ====== Recarga sin medir anchos (evita “expansiones”) ======
    async function reloadWithoutMeasuring() {
        const keepX = qs('rightWrap').scrollLeft;
        const res = payload(await apiGet(`?course_id=${COURSE_ID}`));
        DATA = res || DATA;
        renderTables();
        qs('rightWrap').scrollLeft = keepX;
        syncRowHeights();
    }

    // ====== Anchos izquierda: medir 1 sola vez y “congelar” ======
    let LEFT_WIDTHS_READY = false;
    function ensureLeftWidths(force = false) {
        let LEFT_WIDTHS_READY = false;
        function ensureLeftWidths(force = false) {
            if (LEFT_WIDTHS_READY && !force) return;
            const root = document.documentElement.style;
            const left = document.getElementById('tblLeft'); if (!left) return;

            // mide el ancho real usado por header + celdas
            const widthOf = (sel) => {
                let m = 0; left.querySelectorAll(sel).forEach(el => {
                    const w = Math.ceil(el.scrollWidth) + 14; // padding aproximado
                    if (w > m) m = w;
                });
                return Math.max(m, 48);
            };

            // límites máximos para que la izquierda no “se coma” la pantalla
            const MAX = {
                id: 88,
                ape: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-ape')) || 180,
                nom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--max-nom')) || 180,
                leg: 120,
                p1: 64,
                p2: 64
            };

            const wId = Math.min(widthOf('th:nth-child(1), td.c-id'), MAX.id);
            const wApe = Math.min(widthOf('th:nth-child(2), td.c-ape'), MAX.ape);
            const wNom = Math.min(widthOf('th:nth-child(3), td.c-nom'), MAX.nom);
            const wLeg = Math.min(widthOf('th:nth-child(4), td.c-leg'), MAX.leg);
            const wP1 = Math.min(widthOf('th:nth-child(5), td.c-p1'), MAX.p1);
            const wP2 = Math.min(widthOf('th:nth-child(6), td.c-p2'), MAX.p2);

            root.setProperty('--w-id', wId + 'px');
            root.setProperty('--w-ape', wApe + 'px');
            root.setProperty('--w-nom', wNom + 'px');
            root.setProperty('--w-leg', wLeg + 'px');
            root.setProperty('--w-p1', wP1 + 'px');
            root.setProperty('--w-p2', wP2 + 'px');

            LEFT_WIDTHS_READY = true; // se congelan
        }

    }

    // Solo si el usuario cambia el tamaño de la ventana, re-medimos
    let rAF = null;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => ensureLeftWidths(true));
    });

    // ====== Alturas sincronizadas entre tablas ======
    function syncRowHeights() {
        const L = qs('tbodyLeft').querySelectorAll('tr[data-row]');
        const R = qs('tbodyRight').querySelectorAll('tr[data-row]');
        const n = Math.min(L.length, R.length);
        for (let i = 0; i < n; i++) {
            const lh = L[i].getBoundingClientRect().height;
            const rh = R[i].getBoundingClientRect().height;
            const h = Math.max(lh, rh);
            L[i].style.height = R[i].style.height = h + 'px';
        }
    }

    // ====== Filtros / búsqueda ======
    qs('statusFilter').addEventListener('change', e => { STATUS_FILTER = e.target.value; renderTables(); syncRowHeights(); });
    qs('showCols').addEventListener('change', e => { SHOW = e.target.value; renderTables(); syncRowHeights(); });
    qs('attemptFilter').addEventListener('change', e => { ATT = e.target.value; renderTables(); syncRowHeights(); });
    (function () { let t = null; qs('q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { QUERY = e.target.value.trim().toLowerCase(); renderTables(); syncRowHeights(); }, 160); }); })();

    load().catch(e => { qs('tbodyLeft').innerHTML = `<tr><td colspan="6" style="padding:1rem">Error: ${e.message || e}</td></tr>`; });
})();
