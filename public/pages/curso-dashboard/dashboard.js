renderMenu();

(function () {
  const FAIL = new Set(['A', 'N_E', 'NO_SAT', 'N_S']);
  const state = {
    term: 'ALL',
    topic: 'ALL',
    group: 'ALL',
    risk: 60,
    historyMetric: 'ratio',
    historyOrder: 'asc',
  };

  const els = {
    term: document.getElementById('termFilter'),
    topic: document.getElementById('topicFilter'),
    group: document.getElementById('groupFilter'),
    risk: document.getElementById('riskFilter'),
    kpiGrid: document.getElementById('kpiGrid'),
    chartsGrid: document.getElementById('chartsGrid'),
    syncStatus: document.getElementById('syncStatus'),
  };

  const apiBases = {
    entregas: ['/api/entregas', '/entregas'],
    parciales: ['/api/parciales', '/parciales'],
  };
  const nf = (v) => String(v?.message || v?.error || v || '').toLowerCase().includes('not found');
  const apiGet = async (bases, path) => {
    let idx = 0;
    try {
      const res = await api.get(bases[idx] + path);
      if (res?.error && nf(res)) throw new Error('fallback');
      return res;
    } catch (err) {
      idx = 1;
      return api.get(bases[idx] + path);
    }
  };

  const data = {
    courseId: null,
    entregas: null,
    parciales: null,
  };

  const formatDate = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  };

  const isPass = (code) => !!code && !FAIL.has(String(code).toUpperCase());

  const percent = (num, den) => den > 0 ? Math.round((num / den) * 100) : null;

  const topicLabel = (topic) => ({
    ORG: 'ORG',
    MET: 'MET',
    PLS: 'PLS',
    CUR: 'CUR',
    TEO1: 'TEO1',
    TEO2: 'TEO2',
  }[topic] || topic);

  function getTopicSets() {
    const assignmentTopics = (data.entregas?.assignments || []).map(a => a.topic);
    const parcialTopics = [
      ...(data.parciales?.topics?.p1 || []),
      ...(data.parciales?.topics?.p2 || []),
    ];
    return Array.from(new Set([...assignmentTopics, ...parcialTopics])).filter(Boolean);
  }

  function buildGroupOptions() {
    const groups = data.entregas?.groups || [];
    if (state.group !== 'ALL' && !groups.some(g => String(g.id) === String(state.group))) {
      state.group = 'ALL';
    }
    const options = ['<option value="ALL">Todos los grupos</option>']
      .concat(groups.map(g => `<option value="${g.id}">Grupo ${g.number}${g.name ? ` · ${g.name}` : ''}</option>`));
    els.group.innerHTML = options.join('');
    els.group.value = state.group;
  }

  function buildTopicOptions() {
    const topics = getTopicSets();
    if (state.topic !== 'ALL' && !topics.includes(state.topic)) {
      state.topic = 'ALL';
    }
    els.topic.innerHTML = ['<option value="ALL">Todos los temas</option>']
      .concat(topics.map(t => `<option value="${t}">${topicLabel(t)}</option>`))
      .join('');
    els.topic.value = state.topic;
  }

  function filterAssignments() {
    let list = data.entregas?.assignments || [];
    if (state.term !== 'ALL') list = list.filter(a => String(a.term) === String(state.term));
    if (state.topic !== 'ALL') list = list.filter(a => a.topic === state.topic);
    return list;
  }

  function gradeIndex() {
    const index = {};
    const grades = data.entregas?.grades || [];
    grades.forEach(g => {
      const aid = String(g.assignment_id);
      const gid = String(g.group_id);
      if (!index[aid]) index[aid] = {};
      index[aid][gid] = g.grade_code;
    });
    return index;
  }

  function computeTpStats() {
    const assignments = filterAssignments();
    const grades = gradeIndex();
    const groupFilter = state.group === 'ALL' ? null : String(state.group);
    let graded = 0;
    let approved = 0;

    assignments.forEach(a => {
      const aid = String(a.id);
      const groupGrades = grades[aid] || {};
      const groupIds = groupFilter ? [groupFilter] : Object.keys(groupGrades);
      groupIds.forEach(gid => {
        const code = groupGrades[gid];
        if (code == null || String(code).trim() === '') return;
        graded += 1;
        if (isPass(code)) approved += 1;
      });
    });

    return { graded, approved, ratio: percent(approved, graded) };
  }

  function computeTpByTopic() {
    const assignments = filterAssignments();
    const grades = gradeIndex();
    const groupFilter = state.group === 'ALL' ? null : String(state.group);
    const topics = {};

    assignments.forEach(a => {
      const aid = String(a.id);
      const groupGrades = grades[aid] || {};
      const groupIds = groupFilter ? [groupFilter] : Object.keys(groupGrades);
      groupIds.forEach(gid => {
        const code = groupGrades[gid];
        if (code == null || String(code).trim() === '') return;
        if (!topics[a.topic]) topics[a.topic] = { graded: 0, approved: 0 };
        topics[a.topic].graded += 1;
        if (isPass(code)) topics[a.topic].approved += 1;
      });
    });

    return Object.entries(topics).map(([topic, stats]) => ({
      topic,
      ratio: percent(stats.approved, stats.graded),
      graded: stats.graded,
    }));
  }

  function computeGroupPerformance() {
    const assignments = filterAssignments();
    const grades = gradeIndex();
    const groups = data.entregas?.groups || [];
    const groupStats = groups.map(group => {
      let graded = 0;
      let approved = 0;
      assignments.forEach(a => {
        const code = grades[String(a.id)]?.[String(group.id)];
        if (code == null || String(code).trim() === '') return;
        graded += 1;
        if (isPass(code)) approved += 1;
      });
      return {
        id: group.id,
        number: group.number,
        name: group.name,
        ratio: percent(approved, graded),
        graded,
      };
    });
    return groupStats.sort((a, b) => (b.ratio ?? -1) - (a.ratio ?? -1));
  }

  function topicsWithParcialData() {
    const topics = data.parciales?.topics || { p1: [], p2: [] };
    const candidates = Array.from(new Set([...(topics.p1 || []), ...(topics.p2 || [])]));
    return candidates.filter(topic => {
      const students = data.parciales?.students || [];
      return students.some(student => {
        const attempts = getStudentTopics(student, topic);
        return ['PA', '1R', '2R'].some(att => {
          const code = attempts?.[att];
          return code != null && String(code).trim() !== '';
        });
      });
    });
  }

  function parcialesTopicsForFilter() {
    const topics = data.parciales?.topics || { p1: [], p2: [] };
    const available = topicsWithParcialData();
    let selected = [];
    if (state.term === '1') selected = topics.p1 || [];
    if (state.term === '2') selected = topics.p2 || [];
    if (state.term === 'ALL') selected = [...(topics.p1 || []), ...(topics.p2 || [])];
    if (state.topic !== 'ALL') selected = selected.filter(t => t === state.topic);
    return Array.from(new Set(selected)).filter(t => available.includes(t));
  }

  function studentGroupMatches(student) {
    if (state.group === 'ALL') return true;
    const groupId = String(state.group);
    const group = data.entregas?.groups?.find(g => String(g.id) === groupId);
    if (!group) return true;
    return String(student.group_no) === String(group.number);
  }

  function getStudentTopics(student, topic) {
    const topics = data.parciales?.topics || { p1: [], p2: [] };
    if ((topics.p1 || []).includes(topic)) return student.p1?.[topic] || {};
    return student.p2?.[topic] || {};
  }

  function bestTopicPass(student, topic) {
    const attempts = getStudentTopics(student, topic);
    const order = ['PA', '1R', '2R'];
    for (const att of order) {
      const code = attempts?.[att];
      if (isPass(code)) return true;
    }
    return false;
  }

  function studentAdeudaForFilter(student, topics) {
    if (!topics.length) return [];
    return topics.filter(topic => !bestTopicPass(student, topic));
  }

  function computeParcialesStats() {
    const topics = parcialesTopicsForFilter();
    const students = (data.parciales?.students || [])
      .filter(s => s.status !== 'BAJA')
      .filter(studentGroupMatches);
    if (!topics.length || !students.length) {
      return { ratio: null, passed: 0, total: 0, detail: [] };
    }

    let passed = 0;
    let total = 0;
    const detail = students.map(student => {
      const adeuda = [];
      const missing = [];
      let hasAnyGrade = false;
      topics.forEach(topic => {
        const attempts = getStudentTopics(student, topic);
        const hasGrade = ['PA', '1R', '2R'].some(att => {
          const code = attempts?.[att];
          return code != null && String(code).trim() !== '';
        });
        if (!hasGrade) {
          missing.push(topic);
          return;
        }
        hasAnyGrade = true;
        if (!bestTopicPass(student, topic)) adeuda.push(topic);
      });
      const ok = adeuda.length === 0 && missing.length === 0 && hasAnyGrade;
      if (ok) passed += 1;
      if (hasAnyGrade || missing.length) total += 1;
      return { student, adeuda, missing, hasAnyGrade };
    });

    return {
      ratio: percent(passed, total),
      passed,
      total,
      detail,
    };
  }

  function computeParcialStatusBreakdown(parcialStats) {
    const result = { alDia: 0, recupera: 0, riesgo: 0, sinCargar: 0 };
    (parcialStats.detail || []).forEach(item => {
      const missing = item.missing?.length || 0;
      const adeuda = item.adeuda?.length || 0;
      if (!item.hasAnyGrade) {
        result.sinCargar += 1;
        return;
      }
      if (adeuda > 0) {
        if (adeuda > 2) result.riesgo += 1;
        else result.recupera += 1;
        return;
      }
      if (missing > 0) {
        result.sinCargar += 1;
        return;
      }
      result.alDia += 1;
    });
    return result;
  }

  function computeAlertStudents(groupPerformance) {
    const topics = parcialesTopicsForFilter();
    const threshold = Number(state.risk) || 60;
    const students = (data.parciales?.students || [])
      .filter(s => s.status !== 'BAJA')
      .filter(studentGroupMatches);

    return students.map(student => {
      const adeuda = studentAdeudaForFilter(student, topics);
      const missing = topics.filter(topic => {
        const attempts = getStudentTopics(student, topic);
        return !['PA', '1R', '2R'].some(att => {
          const code = attempts?.[att];
          return code != null && String(code).trim() !== '';
        });
      });
      const group = groupPerformance.find(g => String(g.number) === String(student.group_no));
      const groupRatio = group?.ratio ?? null;
      const lowGroup = groupRatio !== null && groupRatio <= threshold;
      const inRisk = adeuda.length > 0 || missing.length > 0 || lowGroup;
      return {
        student,
        adeuda,
        missing,
        groupRatio,
        inRisk,
      };
    }).filter(item => item.inRisk)
      .sort((a, b) => (b.adeuda.length - a.adeuda.length));
  }

  function computeHighlights(groupPerformance) {
    const topics = parcialesTopicsForFilter();
    const gradeOptions = (data.parciales?.grade_options || data.entregas?.grade_options || []);
    const gradeIndex = new Map(gradeOptions.map((code, idx) => [String(code), idx + 1]));
    const students = (data.parciales?.students || [])
      .filter(s => s.status !== 'BAJA')
      .filter(studentGroupMatches);

    const scored = students.map(student => {
      let sumScore = 0;
      let count = 0;
      topics.forEach(topic => {
        const attempts = getStudentTopics(student, topic);
        const scores = ['PA', '1R', '2R']
          .map(att => gradeIndex.get(String(attempts?.[att] || '')) || 0)
          .filter(score => score > 0);
        if (!scores.length) return;
        sumScore += Math.max(...scores);
        count += 1;
      });
      const avg = count ? sumScore / count : null;
      return { student, avg, count };
    }).filter(item => item.avg !== null);

    return scored.sort((a, b) => (b.avg - a.avg)).slice(0, 5);
  }

  function computeTpStatus() {
    const assignments = filterAssignments();
    const grades = gradeIndex();
    const groups = data.entregas?.groups || [];
    const groupFilter = state.group === 'ALL' ? null : String(state.group);
    const groupIds = groupFilter ? [groupFilter] : groups.map(g => String(g.id));
    let approved = 0;
    let failed = 0;
    let missing = 0;

    assignments.forEach(a => {
      const aid = String(a.id);
      groupIds.forEach(gid => {
        const code = grades[aid]?.[gid];
        if (code == null || String(code).trim() === '') {
          missing += 1;
          return;
        }
        if (isPass(code)) approved += 1;
        else failed += 1;
      });
    });

    return { approved, failed, missing };
  }

  function computeTpHistory() {
    const assignments = filterAssignments();
    const grades = gradeIndex();
    const groups = data.entregas?.groups || [];
    const groupFilter = state.group === 'ALL' ? null : String(state.group);
    const groupIds = groupFilter ? [groupFilter] : groups.map(g => String(g.id));
    const missingDates = [];

    const points = assignments.reduce((acc, assignment) => {
      const dateValue = assignment.due_date || (assignment.created_at ? assignment.created_at.split(' ')[0] : '');
      if (!dateValue) {
        missingDates.push({ assignment, reason: 'Sin fecha' });
        return acc;
      }
      let graded = 0;
      let approved = 0;
      groupIds.forEach(gid => {
        const code = grades[String(assignment.id)]?.[gid];
        if (code == null || String(code).trim() === '') return;
        graded += 1;
        if (isPass(code)) approved += 1;
      });
      const ratio = percent(approved, graded);
      acc.push({
        date: dateValue,
        ratio: ratio ?? 0,
        graded,
        approved,
        label: assignment.name || `${assignment.type} #${assignment.number}`,
        topic: assignment.topic,
        term: assignment.term,
      });
      return acc;
    }, []);

    points.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { points, missingDates };
  }

  function buildHistorySeries(points, metric = 'ratio') {
    const topics = Array.from(new Set(points.map(p => p.topic))).filter(Boolean);
    const dates = Array.from(new Set(points.map(p => p.date))).sort((a, b) => new Date(a) - new Date(b));
    const metricValue = (item) => (metric === 'graded' ? item.graded : item.ratio);

    const series = topics.map((topic, idx) => {
      const data = dates.map(date => {
        const items = points.filter(p => p.date === date && p.topic === topic);
        if (!items.length) return null;
        const sum = items.reduce((acc, item) => acc + metricValue(item), 0);
        return sum / items.length;
      });
      return { topic, data, color: HISTORY_COLORS[idx % HISTORY_COLORS.length] };
    });

    return { series, dates };
  }

  function buildSparkline(points, metric = 'ratio') {
    if (!points.length) return '<div class="empty">Sin datos suficientes para graficar.</div>';
    const width = 420;
    const height = 160;
    const padding = 12;
    const values = points.map(p => (metric === 'graded' ? p.graded : p.ratio));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = (width - padding * 2) / (points.length - 1 || 1);

    const coords = points.map((p, idx) => {
      const x = padding + idx * step;
      const value = metric === 'graded' ? p.graded : p.ratio;
      const y = padding + (height - padding * 2) * (1 - (value - min) / span);
      return { x, y };
    });

    const line = coords.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${line} L ${padding + (points.length - 1) * step} ${height - padding} L ${padding} ${height - padding} Z`;
    const latestPoint = points[points.length - 1];
    const latest = metric === 'graded' ? latestPoint?.graded ?? 0 : latestPoint?.ratio ?? 0;
    const high = max;
    const low = min;
    const label = metric === 'graded' ? 'Correcciones' : 'Aprobación';
    const firstDate = points[0]?.date || '';
    const lastDate = points[points.length - 1]?.date || '';

    return `
      <div class="sparkline-meta">
        <span>${label}: <strong>${metric === 'graded' ? latest : `${latest}%`}</strong></span>
        <span>Alta: <strong>${metric === 'graded' ? high : `${high}%`}</strong></span>
        <span>Baja: <strong>${metric === 'graded' ? low : `${low}%`}</strong></span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" class="sparkline">
        <defs>
          <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,189,248,0.6)"/>
            <stop offset="100%" stop-color="rgba(56,189,248,0.05)"/>
          </linearGradient>
        </defs>
        <path d="${area}" class="sparkline-area"></path>
        <path d="${line}" class="sparkline-line"></path>
      </svg>
      <div class="sparkline-axis">
        <span>${firstDate}</span>
        <span>${lastDate}</span>
      </div>
    `;
  }

  const HISTORY_COLORS = ['#38bdf8', '#22c55e', '#f97316', '#a78bfa', '#facc15', '#ef4444'];

  function buildHistoryChart(points, metric = 'ratio') {
    if (!points.length) return '<div class="empty">Sin datos suficientes para graficar.</div>';
    const width = 900;
    const height = 280;
    const padding = 40;
    const { series, dates } = buildHistorySeries(points, metric);
    if (!series.length || dates.length < 2) return '<div class="empty">Sin datos suficientes para graficar.</div>';

    const allValues = series.flatMap(s => s.data.filter(v => v !== null));
    const min = metric === 'ratio' ? 0 : Math.min(...allValues);
    const max = metric === 'ratio' ? 100 : Math.max(...allValues);
    const span = max - min || 1;
    const step = (width - padding * 2) / (dates.length - 1);

    const yFor = (value) => padding + (height - padding * 2) * (1 - (value - min) / span);

    const lines = series.map(s => {
      const coords = s.data.map((value, idx) => {
        if (value === null) return null;
        const x = padding + idx * step;
        const y = yFor(value);
        return { x, y };
      }).filter(Boolean);
      if (!coords.length) return '';
      const first = coords[0];
      const baseY = yFor(min);
      const points = coords.map(p => `${p.x},${p.y}`).join(' ');
      return `
        <line x1="${first.x}" y1="${baseY}" x2="${first.x}" y2="${first.y}" stroke="${s.color}" stroke-width="2" />
        <polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${points}" />
      `;
    }).join('');

    const ticks = [min, (min + max) / 2, max].map((value, idx) => {
      const y = yFor(value);
      const label = metric === 'graded' ? Math.round(value) : `${Math.round(value)}%`;
      return `<g>
        <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="history-grid"/>
        <text x="8" y="${y + 4}" class="history-axis${idx === 0 || idx === 2 ? ' history-axis--strong' : ''}">${label}</text>
      </g>`;
    }).join('');

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const xLabels = dates.map((date, idx) => {
      const [year, month, day] = date.split('-');
      const label = `${day}/${month}`;
      const x = padding + idx * step;
      return `<text x="${x}" y="${height - 10}" text-anchor="middle" class="history-axis">${label}</text>`;
    }).join('');

    const pointsLayer = series.map(s => s.data.map((value, idx) => {
      if (value === null) return '';
      const x = padding + idx * step;
      const y = yFor(value);
      return `<circle cx="${x}" cy="${y}" r="4" class="history-point" stroke="${s.color}" />`;
    }).join('')).join('');

    const legend = series.map(s => `
      <span><span class="legend-line" style="background:${s.color}"></span>${s.topic}</span>
    `).join('');

    return `
      <div class="history-legend">${legend}</div>
      <svg viewBox="0 0 ${width} ${height}" class="history-chart">
        ${ticks}
        ${lines}
        ${pointsLayer}
        ${xLabels}
      </svg>
      <div class="sparkline-axis">
        <span>${firstDate}</span>
        <span>${lastDate}</span>
      </div>
    `;
  }

  function computeUpcomingAssignments() {
    const assignments = data.entregas?.assignments || [];
    const today = new Date();
    const upcoming = assignments.filter(a => a.due_date && !Number(a.returned)).filter(a => {
      const due = new Date(a.due_date + 'T00:00:00');
      return due >= today;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return upcoming.slice(0, 5);
  }

  function renderKpis(stats) {
    const { tpStats, parcialStats, alerts, highlights } = stats;
    const tpRatio = tpStats.ratio ?? 0;
    const parcialRatio = parcialStats.ratio ?? 0;

    els.kpiGrid.innerHTML = `
      <div class="stat-card">
        <h3>Aprobación TPs</h3>
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center">
          <div>
            <div class="stat-value">${tpStats.ratio ?? '—'}%</div>
            <div class="stat-meta">
              <span>${tpStats.approved} aprobadas</span>
              <span>•</span>
              <span>${tpStats.graded} corregidas</span>
            </div>
          </div>
          <div class="donut" style="--value:${tpRatio};--color:var(--primary)"><span>${tpStats.ratio ?? '—'}%</span></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Aprobación parciales</h3>
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center">
          <div>
            <div class="stat-value">${parcialStats.ratio ?? '—'}%</div>
            <div class="stat-meta">
              <span>${parcialStats.passed} al día</span>
              <span>•</span>
              <span>${parcialStats.total} evaluados</span>
            </div>
          </div>
          <div class="donut" style="--value:${parcialRatio};--color:var(--accent)"><span>${parcialStats.ratio ?? '—'}%</span></div>
        </div>
      </div>
      <div class="stat-card">
        <h3>Alumnos en alerta</h3>
        <div class="stat-value">${alerts.length}</div>
        <div class="stat-meta">
          <span>Umbral: ≤ ${state.risk}%</span>
          <span>•</span>
          <span>${alerts.slice(0, 2).map(a => `${a.student.apellido}`).join(', ') || 'Sin alertas'}</span>
        </div>
      </div>
      <div class="stat-card">
        <h3>Destacan</h3>
        <div class="stat-value">${highlights.length}</div>
        <div class="stat-meta">
          <span>${highlights.slice(0, 2).map(h => `${h.student.apellido}`).join(', ') || 'Sin datos aún'}</span>
        </div>
      </div>
    `;
  }

  function renderCharts(stats) {
    const { topicStats, groupPerformance, upcoming, parcialStats, alerts, highlights, tpStatus, tpHistory } = stats;

    const weakTopics = topicStats
      .filter(t => t.ratio !== null)
      .sort((a, b) => a.ratio - b.ratio);

    const groupTop = groupPerformance.slice(0, 5);

    const parcialBreakdown = computeParcialStatusBreakdown(parcialStats);
    const { alDia, recupera, riesgo, sinCargar } = parcialBreakdown;

    const totalParciales = alDia + recupera + riesgo + sinCargar;
    const pOk = percent(alDia, totalParciales) ?? 0;
    const pRec = percent(recupera, totalParciales) ?? 0;
    const pRisk = percent(riesgo, totalParciales) ?? 0;
    const pEmpty = percent(sinCargar, totalParciales) ?? 0;

    const alertList = alerts.slice(0, 5).map(item => `
      <div class="list-item alert">
        <div>
          <strong>${item.student.apellido} ${item.student.nombre}</strong>
          <div class="muted" style="font-size:.8rem">Adeuda: ${item.adeuda.join(', ') || '—'}${item.missing?.length ? ` · Sin cargar: ${item.missing.join(', ')}` : ''}</div>
        </div>
        <span class="chip alert">Grupo ${item.student.group_no || '—'}</span>
      </div>`).join('');

    const highlightList = highlights.map(item => `
      <div class="list-item">
        <div>
          <strong>${item.student.apellido} ${item.student.nombre}</strong>
          <div class="muted" style="font-size:.8rem">Promedio: ${item.avg.toFixed(1)} · Temas: ${item.count}</div>
        </div>
        <span class="chip">OK</span>
      </div>`).join('');

    const upcomingList = upcoming.length
      ? upcoming.map(item => `
          <div class="list-item">
            <div>
              <strong>${item.name || `${item.type} #${item.number}`}</strong>
              <div class="muted" style="font-size:.8rem">${item.topic} · ${item.term}° cuatri</div>
            </div>
            <span class="chip">${formatDate(item.due_date)}</span>
          </div>`).join('')
      : '<div class="empty">No hay entregas próximas cargadas.</div>';

    const topicBars = weakTopics.length
      ? weakTopics.map(topic => {
        const ratio = topic.ratio ?? 0;
        const tone = ratio >= 80 ? 'top' : ratio > 60 ? 'good' : ratio >= 50 ? 'warn' : 'danger';
        return `
          <div class="bar">
            <div>${topicLabel(topic.topic)}</div>
            <div class="bar-track"><div class="bar-fill ${tone}" style="width:${ratio}%"></div></div>
            <div>${ratio}%</div>
          </div>`;
      }).join('')
      : '<div class="empty">Todavía no hay datos para calcular promedios por tema.</div>';

    const groupBars = groupTop.length
      ? groupTop.map(group => {
        const ratio = group.ratio ?? 0;
        const groupLabel = group.name && String(group.name).trim()
          ? group.name
          : `Grupo ${group.number}`;
        return `
          <div class="bar">
            <div>${groupLabel}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${ratio}%"></div></div>
            <div>${ratio ?? '—'}%</div>
          </div>`;
      }).join('')
      : '<div class="empty">No hay calificaciones suficientes para comparar grupos.</div>';

    const tpTotals = tpStatus.approved + tpStatus.failed + tpStatus.missing;
    const tpOk = percent(tpStatus.approved, tpTotals) ?? 0;
    const tpFail = percent(tpStatus.failed, tpTotals) ?? 0;
    const tpMissing = percent(tpStatus.missing, tpTotals) ?? 0;

    const sortedHistory = [...tpHistory.points].sort((a, b) => {
      if (state.historyOrder === 'desc') return new Date(b.date) - new Date(a.date);
      return new Date(a.date) - new Date(b.date);
    });
    const tpHistoryChart = buildHistoryChart(sortedHistory, state.historyMetric);
    const historyRows = sortedHistory.map(item => `
      <tr>
        <td>${item.date}</td>
        <td>${item.label}</td>
        <td>${item.topic}</td>
        <td>${item.term}°</td>
        <td>${state.historyMetric === 'graded' ? item.graded : `${item.ratio}%`}</td>
      </tr>
    `).join('');
    const missingDates = tpHistory.missingDates.length
      ? `<div class="legend">Sin fecha de carga: ${tpHistory.missingDates.map(({ assignment }) => assignment.name || `${assignment.type} #${assignment.number}`).join(', ')}</div>`
      : '<div class="legend">Todas las entregas tienen fecha de carga.</div>';

    els.chartsGrid.innerHTML = `
      <div class="dashboard-subgrid two">
        <div class="stat-card card-topic">
          <h3>Promedio por tema</h3>
          <div class="muted" style="font-size:.85rem">Basado en entregas con calificación.</div>
          <div class="bars">${topicBars}</div>
        </div>
        <div class="stat-card card-group">
          <h3>Rendimiento por grupo</h3>
          <div class="muted" style="font-size:.85rem">Aprobación promedio de TPs.</div>
          <div class="bars">${groupBars}</div>
        </div>
      </div>
      <div class="dashboard-subgrid two">
        <div class="stat-card card-parcial">
          <h3>Estado de parciales</h3>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
            <div class="donut" style="--value:${pOk};--color:#22c55e"><span>${pOk}%</span></div>
            <div>
              <div class="stat-meta" style="margin:0">
                <span><span class="dot" style="background:#22c55e"></span>Al día: ${alDia}</span>
                <span><span class="dot" style="background:#facc15"></span>Recup.: ${recupera}</span>
                <span><span class="dot" style="background:#ef4444"></span>Riesgo: ${riesgo}</span>
                <span><span class="dot" style="background:#94a3b8"></span>Sin cargar: ${sinCargar}</span>
              </div>
              <div class="stacked">
                <span style="flex:${pOk};background:#22c55e"></span>
                <span style="flex:${pRec};background:#facc15"></span>
                <span style="flex:${pRisk};background:#ef4444"></span>
                <span style="flex:${pEmpty};background:#94a3b8"></span>
              </div>
            </div>
          </div>
        </div>
        <div class="stat-card card-tp">
          <h3>Estado de TPs</h3>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
            <div class="donut" style="--value:${tpOk};--color:#38bdf8"><span>${tpOk}%</span></div>
            <div>
              <div class="stat-meta" style="margin:0">
                <span><span class="dot" style="background:#38bdf8"></span>Aprobados: ${tpStatus.approved}</span>
                <span><span class="dot" style="background:#ef4444"></span>Desaprobados: ${tpStatus.failed}</span>
                <span><span class="dot" style="background:#94a3b8"></span>Sin corregir: ${tpStatus.missing}</span>
              </div>
              <div class="stacked">
                <span style="flex:${tpOk};background:#38bdf8"></span>
                <span style="flex:${tpFail};background:#ef4444"></span>
                <span style="flex:${tpMissing};background:#94a3b8"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="dashboard-subgrid three">
        <div class="stat-card card-upcoming">
          <h3>Próximas entregas</h3>
          <div class="list">${upcomingList}</div>
        </div>
        <div class="stat-card card-alert">
          <h3>Alumnos en alerta</h3>
          <div class="list">${alertList || '<div class="empty">Sin alertas en este filtro.</div>'}</div>
        </div>
        <div class="stat-card card-highlight">
          <h3>Alumnos que destacan</h3>
          <div class="list">${highlightList || '<div class="empty">Todavía no hay destacados.</div>'}</div>
        </div>
      </div>
      <div class="stat-card full card-history">
        <h3>Histórico de TPs (por fecha de carga)</h3>
        <div class="muted" style="font-size:.85rem">Aprobación en el tiempo según las fechas de carga.</div>
        <div class="history-controls">
          <label>Vista
            <select id="historyMetric" class="select">
              <option value="ratio">Aprobación %</option>
              <option value="graded">Correcciones</option>
            </select>
          </label>
          <label>Orden
            <select id="historyOrder" class="select">
              <option value="asc">Fecha ascendente</option>
              <option value="desc">Fecha descendente</option>
            </select>
          </label>
        </div>
        ${tpHistoryChart}
        <div class="history-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>TP</th>
                <th>Tema</th>
                <th>Cuatri</th>
                <th>${state.historyMetric === 'graded' ? 'Correcciones' : 'Aprobación'}</th>
              </tr>
            </thead>
            <tbody>
              ${historyRows || '<tr><td colspan="5" class="empty">Sin registros para mostrar.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${missingDates}
      </div>
    `;

    const metricSelect = document.getElementById('historyMetric');
    const orderSelect = document.getElementById('historyOrder');
    if (metricSelect && orderSelect) {
      metricSelect.value = state.historyMetric;
      orderSelect.value = state.historyOrder;
      metricSelect.onchange = (event) => {
        state.historyMetric = event.target.value;
        render();
      };
      orderSelect.onchange = (event) => {
        state.historyOrder = event.target.value;
        render();
      };
    }
  }

  function render() {
    const tpStats = computeTpStats();
    const groupPerformance = computeGroupPerformance();
    const topicStats = computeTpByTopic();
    const parcialStats = computeParcialesStats();
    const alerts = computeAlertStudents(groupPerformance);
    const highlights = computeHighlights(groupPerformance);
    const upcoming = computeUpcomingAssignments();
    const tpStatus = computeTpStatus();
    const tpHistory = computeTpHistory();

    const stats = { tpStats, groupPerformance, topicStats, parcialStats, alerts, highlights, upcoming, tpStatus, tpHistory };
    renderKpis(stats);
    renderCharts(stats);
  }

  function bindFilters() {
    els.term.addEventListener('change', (event) => {
      state.term = event.target.value;
      render();
    });
    els.topic.addEventListener('change', (event) => {
      state.topic = event.target.value;
      render();
    });
    els.group.addEventListener('change', (event) => {
      state.group = event.target.value;
      render();
    });
    els.risk.addEventListener('change', (event) => {
      state.risk = Number(event.target.value);
      render();
    });
  }

  async function load() {
    els.syncStatus.textContent = 'Actualizando...';

    if (!api.getToken()) {
      location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/');
      return;
    }

    try {
      data.courseId = Number(await courseContext.require());
      const [entregas, parciales] = await Promise.all([
        apiGet(apiBases.entregas, `?course_id=${data.courseId}&term=ALL`),
        apiGet(apiBases.parciales, `?course_id=${data.courseId}`),
      ]);
      data.entregas = entregas || { assignments: [], groups: [], grades: [], grade_options: [] };
      data.parciales = parciales || { students: [], topics: { p1: [], p2: [] }, grade_options: [] };
      els.syncStatus.textContent = 'Datos actualizados';
    } catch (err) {
      console.warn('No se pudo cargar el dashboard', err);
      data.entregas = { assignments: [], groups: [], grades: [], grade_options: [] };
      data.parciales = { students: [], topics: { p1: [], p2: [] }, grade_options: [] };
      els.syncStatus.textContent = 'Sin datos disponibles';
    }

    buildTopicOptions();
    buildGroupOptions();
    render();
  }

  bindFilters();
  load();
})();