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

    let COURSE_ID = null, DATA = { students: [], grade_options: [], topics: null };
    let CAN_EDIT = false;
    let PERMISSIONS_READY = false;
    let STATUS_FILTER = 'ALL', SHOW = 'ALL', ATT = 'ALL', QUERY = '', TOPIC_FILTER = 'ALL';
    let SCROLL_SYNC_READY = false;

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
    const DEFAULT_TOPICS = { p1: ['ORG', 'MET', 'TEO1'], p2: ['PLS', 'CUR', 'TEO2'] };
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

     async function ensurePermissions() {
        if (PERMISSIONS_READY) return;
        const me = await api.get('/me');
        const roles = Array.isArray(me.roles) ? me.roles : [];
        CAN_EDIT = roles.includes('GURU') || roles.includes('SENIOR');
        PERMISSIONS_READY = true;
    }

    async function load() {
        await ensurePermissions();

        if (!api.getToken()) {
            location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/');
            return;
        }

        COURSE_ID = Number(await courseContext.require());
        if (!Number.isFinite(COURSE_ID) || COURSE_ID <= 0) {
            throw new Error('No hay curso seleccionado');
        }

        const keepX = qs('rightWrap').scrollLeft;
        const res = payload(await apiGet(`?course_id=${COURSE_ID}`));
        DATA = res || DATA;
        renderTopicOptions();
        renderTables();
        qs('rightWrap').scrollLeft = keepX;
        ensureLeftWidths();   // << calcula 1 sola vez
        syncRowHeights();
    }


     // =================== Render Tablas ===================
    const ATT_LABEL = { PA: 'PARC', '1R': '1R', '2R': '2R' };
    const ALL_ATTEMPTS = ['PA', '1R', '2R'];
    const TONE_CLASS = { ORG: 'tone-org', MET: 'tone-met', TEO1: 'tone-teo', PLS: 'tone-pls', CUR: 'tone-cur', TEO2: 'tone-teo2' };
    const SCROLL_OBSERVERS = new WeakMap()

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

    function headRight() {
        const atts = attemptsShown();
        const { p1, p2 } = topicsForShow();
        const cells = [];
        const lastAttempt = atts[atts.length - 1];
        const lastTopic = (list, topic) => list.length && list[list.length - 1] === topic;
        const addTopic = (topic, attempt) => {
            const tone = TONE_CLASS[topic] || '';
            const isTopicEnd = attempt === lastAttempt;
            const isPartialDivider = isTopicEnd && p2.length && p1.includes(topic) && lastTopic(p1, topic);
            const classes = [tone];
            if (isTopicEnd) classes.push('topic-end');
            if (isPartialDivider) classes.push('partial-divider');
            const classAttr = classes.filter(Boolean).length ? ` class="${classes.filter(Boolean).join(' ')}"` : '';
            cells.push(`<th${classAttr}>${topic}_${ATT_LABEL[attempt]}</th>`);
        };
        p1.forEach(topic => atts.forEach(a => addTopic(topic, a)));
        p2.forEach(topic => atts.forEach(a => addTopic(topic, a)));
        return `<tr>${cells.join('')}</tr>`;
    }

    function rowLeft(r) {
        const p1 = parcialText(r.adeuda_p1, 1);
        const p2 = parcialText(r.adeuda_p2, 2);
        return `<tr data-row>
      <td class="c-id">${r.course_id_seq}</td>
      <td class="c-ape">${r.apellido}</td>
      <td class="c-nom">${r.nombre}</td>
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
        const { p1, p2 } = topicsForShow();
        const p1AP = !r.adeuda_p1 || r.adeuda_p1.length === 0;
        const p2AP = !r.adeuda_p2 || r.adeuda_p2.length === 0;
        const lastAttempt = atts[atts.length - 1];
        const lastTopic = (list, topic) => list.length && list[list.length - 1] === topic;

        const hasAnyPass = (p, t) => ALL_ATTEMPTS.some(a => pass(r[p]?.[t]?.[a]));

        const sel = (p, t, a, options = {}) => {
            const v = (r[p]?.[t]?.[a] || '');
            const gClass = cellClassFromGrade(v);
            const apClass = (p === 'p1' && p1AP) || (p === 'p2' && p2AP) ? 'td-partial-ap' : '';
            const topicPassClass = !gClass && hasAnyPass(p, t) ? 'td-topic-pass' : '';
            const sClass = gClass === 'td-fail' ? 'fail' : (gClass === 'td-pass' ? 'pass' : '');
            const tdClass = gClass || apClass || topicPassClass;
            const classes = [];
            if (tdClass) classes.push(tdClass);
            if (options.topicEnd) classes.push('topic-end');
            if (options.partialDivider) classes.push('partial-divider');
            return `<td class="${classes.join(' ')}"><select class="score ${sClass}" data-enroll="${r.enrollment_id}" data-partial="${p === 'p1' ? 1 : 2}" data-topic="${t}" data-attempt="${a}">${optHTML(v)}</select></td>`;        };
        const cells = [];
        p1.forEach(topic => atts.forEach(a => {
            const isTopicEnd = a === lastAttempt;
            const isPartialDivider = isTopicEnd && p2.length && lastTopic(p1, topic);
            cells.push(sel('p1', topic, a, { topicEnd: isTopicEnd, partialDivider: isPartialDivider }));
        }));
        p2.forEach(topic => atts.forEach(a => {
            const isTopicEnd = a === lastAttempt;
            cells.push(sel('p2', topic, a, { topicEnd: isTopicEnd }));
        }));
        return `<tr data-row>${cells.join('')}</tr>`;
    }

    function renderTables() {
        const st = filtered();
        qs('tbodyLeft').innerHTML = st.map(rowLeft).join('') || `<tr><td colspan="5" class="muted">Sin estudiantes</td></tr>`;
        qs('theadRight').innerHTML = headRight();
        qs('tbodyRight').innerHTML = st.map(rowRight).join('') || `<tr><td class="muted">Sin datos</td></tr>`;
        setupScrollSync();

        // Guardar sin “recalcular anchos”
        qs('tbodyRight').querySelectorAll('select.score').forEach(s => {
            if (!CAN_EDIT) {
                s.disabled = true;
                return;
            }
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

    function setupScrollSync() {
        document.querySelectorAll('.table-scroll').forEach(scrollbar => {
            const targetId = scrollbar.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (!target) return;
            const inner = scrollbar.querySelector('.table-scroll-inner');
            const table = target.querySelector('table');
            const syncSize = () => {
                const width = Math.max(target.scrollWidth, table ? table.scrollWidth : 0);
                inner.style.width = `${Math.max(width, target.clientWidth)}px`;
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
            if (!SCROLL_OBSERVERS.has(scrollbar)) {
                const observer = new ResizeObserver(syncSize);
                observer.observe(target);
                if (table) observer.observe(table);
                SCROLL_OBSERVERS.set(scrollbar, observer);
            }
            syncSize();
            requestAnimationFrame(syncSize);
            syncFromBody();
        });
        SCROLL_SYNC_READY = true;
    }

    // ====== Recarga sin medir anchos (evita “expansiones”) ======
    async function reloadWithoutMeasuring() {
        const keepX = qs('rightWrap').scrollLeft;
        const res = payload(await apiGet(`?course_id=${COURSE_ID}`));
        DATA = res || DATA;
        renderTopicOptions();
        renderTables();
        qs('rightWrap').scrollLeft = keepX;
        syncRowHeights();
    }

    // ====== Anchos izquierda: medir 1 sola vez y “congelar” ======
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
            p1: 64,
            p2: 64
        };

        const wId = Math.min(widthOf('th:nth-child(1), td.c-id'), MAX.id);
        const wApe = Math.min(widthOf('th:nth-child(2), td.c-ape'), MAX.ape);
        const wNom = Math.min(widthOf('th:nth-child(3), td.c-nom'), MAX.nom);
        const wP1 = Math.min(widthOf('th:nth-child(4), td.c-p1'), MAX.p1);
        const wP2 = Math.min(widthOf('th:nth-child(5), td.c-p2'), MAX.p2);

        root.setProperty('--w-id', wId + 'px');
        root.setProperty('--w-ape', wApe + 'px');
        root.setProperty('--w-nom', wNom + 'px');
        root.setProperty('--w-p1', wP1 + 'px');
        root.setProperty('--w-p2', wP2 + 'px');
        root.setProperty('--w-left-total', (wId + wApe + wNom + wP1 + wP2 + 1) + 'px');

        LEFT_WIDTHS_READY = true; // se congelan
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
    qs('topicFilter').addEventListener('change', e => { TOPIC_FILTER = e.target.value; renderTables(); syncRowHeights(); });
    (function () { let t = null; qs('q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { QUERY = e.target.value.trim().toLowerCase(); renderTables(); syncRowHeights(); }, 160); }); })();

    load().catch(e => { qs('tbodyLeft').innerHTML = `<tr><td colspan="5" style="padding:1rem">Error: ${e.message || e}</td></tr>`; });
})();