(() => {
  const dayLabels = {
    LUN: 'Lunes',
    MAR: 'Martes',
    MIE: 'Miércoles',
    JUE: 'Jueves',
    VIE: 'Viernes',
    SAB: 'Sábado',
    DOM: 'Domingo',
  };
  const kindLabels = {
    PARCIAL: 'Parcial',
    RECUPERATORIO: 'Recuperatorio',
    TP: 'Entrega TP',
    TP_PRORROGA: 'Prórroga TP',
    CIERRE_NOTAS: 'Cierre de notas',
    PUBLICACION_NOTAS: 'Publicación de notas',
    OTRO: 'Otro',
  };

  const state = {
    courseId: null,
    permissions: { can_edit: false, can_delete: false, can_publish: false, can_draft: false },
    filters: { term: '', topic: '' },
    analytics: {},
    schedules: [],
    keyDates: [],
    announcements: [],
  };

  const moduleConfig = [
    { id: 'performance', label: 'Rendimiento del curso', description: 'Gráficos de aprobación y notas.' },
    { id: 'history', label: 'Analítica histórica', description: 'Evolución por cuatrimestre.' },
    { id: 'operations', label: 'Seguimiento operativo', description: 'Alumnos en riesgo y TPs.' },
    { id: 'support', label: 'Consultas y soporte', description: 'Inbox con asignaciones.' },
    { id: 'quick-access', label: 'Accesos rápidos', description: 'Links a acciones clave.' },
    { id: 'calendar', label: 'Fechas clave', description: 'Horarios y agenda.' },
    { id: 'team', label: 'Equipo del curso', description: 'Roles y contactos.' },
    { id: 'announcements', label: 'Anuncios', description: 'Avisos y alertas.' },
  ];

  const MODULE_STORAGE_KEY = 'curso-dashboard-modules';

  const els = {
    filterTerm: document.getElementById('filterTerm'),
    filterTopic: document.getElementById('filterTopic'),
    summaryGrid: document.getElementById('summaryGrid'),
    moduleToggles: document.getElementById('moduleToggles'),
    scheduleList: document.getElementById('scheduleList'),
    keyDateList: document.getElementById('keyDateList'),
    teamList: document.getElementById('teamList'),
    announcementList: document.getElementById('announcementList'),
    refreshBtn: document.getElementById('refreshBtn'),
    addScheduleBtn: document.getElementById('addScheduleBtn'),
    addKeyDateBtn: document.getElementById('addKeyDateBtn'),
    addAnnouncementBtn: document.getElementById('addAnnouncementBtn'),
    clearTopicFilter: document.getElementById('clearTopicFilter'),
    approvalBreakdown: document.getElementById('approvalBreakdown'),
    approvalLegend: document.getElementById('approvalLegend'),
    topicApprovalList: document.getElementById('topicApprovalList'),
    gradeHistogram: document.getElementById('gradeHistogram'),
    historyTrends: document.getElementById('historyTrends'),
    historyTableBody: document.getElementById('historyTableBody'),
    riskList: document.getElementById('riskList'),
    tpTracking: document.getElementById('tpTracking'),
    supportInbox: document.getElementById('supportInbox'),
    quickAccessList: document.getElementById('quickAccessList'),
    scheduleModal: document.getElementById('scheduleModal'),
    keyDateModal: document.getElementById('keyDateModal'),
    announcementModal: document.getElementById('announcementModal'),
    historyModal: document.getElementById('historyModal'),
    scheduleModalTitle: document.getElementById('scheduleModalTitle'),
    keyDateModalTitle: document.getElementById('keyDateModalTitle'),
    announcementModalTitle: document.getElementById('announcementModalTitle'),
    historyModalTitle: document.getElementById('historyModalTitle'),
    historyList: document.getElementById('historyList'),
  };

  const scheduleForm = {
    id: null,
    day: document.getElementById('scheduleDay'),
    modality: document.getElementById('scheduleModality'),
    start: document.getElementById('scheduleStart'),
    end: document.getElementById('scheduleEnd'),
    location: document.getElementById('scheduleLocation'),
    notes: document.getElementById('scheduleNotes'),
    publish: document.getElementById('schedulePublish'),
    publishField: document.getElementById('schedulePublishField'),
    save: document.getElementById('scheduleSave'),
    cancel: document.getElementById('scheduleCancel'),
  };


  const keyDateForm = {
    id: null,
    kind: document.getElementById('keyDateKind'),
    title: document.getElementById('keyDateTitle'),
    date: document.getElementById('keyDateDate'),
    time: document.getElementById('keyDateTime'),
    term: document.getElementById('keyDateTerm'),
    topic: document.getElementById('keyDateTopic'),
    notes: document.getElementById('keyDateNotes'),
    publish: document.getElementById('keyDatePublish'),
    publishField: document.getElementById('keyDatePublishField'),
    save: document.getElementById('keyDateSave'),
    cancel: document.getElementById('keyDateCancel'),
  };

  const announcementForm = {
    id: null,
    title: document.getElementById('announcementTitle'),
    body: document.getElementById('announcementBody'),
    reminder: document.getElementById('announcementReminder'),
    status: document.getElementById('announcementStatus'),
    start: document.getElementById('announcementStart'),
    end: document.getElementById('announcementEnd'),
    pinned: document.getElementById('announcementPinned'),
    save: document.getElementById('announcementSave'),
    cancel: document.getElementById('announcementCancel'),
  };

  function openModal(el) {
    el.style.display = 'flex';
  }
  function closeModal(el) {
    el.style.display = 'none';
  }
  function formatDate(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);
  }
  function formatTime(value) {
    if (!value) return '';
    return value.slice(0, 5);
  }
  function formatDateTime(value) {
    if (!value) return 'Sin fecha';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function toInputDateTime(value) {
    if (!value) return '';
    return value.replace(' ', 'T').slice(0, 16);
  }

  function getDefaultAnalytics() {
    return {
      approval_breakdown: { approved: 68, failed: 22, absent: 10 },
      approval_by_topic: [
        { topic: 'Intro', approval_rate: 78, total: 42 },
        { topic: 'Modelado', approval_rate: 64, total: 35 },
        { topic: 'Optimización', approval_rate: 72, total: 28 },
        { topic: 'Simulación', approval_rate: 58, total: 24 },
      ],
      grade_distribution: [
        { range: '0-2', count: 4 },
        { range: '2-4', count: 9 },
        { range: '4-6', count: 18 },
        { range: '6-8', count: 22 },
        { range: '8-10', count: 15 },
      ],
      historical_terms: [
        { term: '2023 · 1C', approval_rate: 62, average_grade: 6.1, enrolled: 118, took_exam: 96, absent: 22 },
        { term: '2023 · 2C', approval_rate: 67, average_grade: 6.4, enrolled: 121, took_exam: 102, absent: 19 },
        { term: '2024 · 1C', approval_rate: 70, average_grade: 6.8, enrolled: 125, took_exam: 110, absent: 15 },
        { term: '2024 · 2C', approval_rate: 74, average_grade: 7.1, enrolled: 132, took_exam: 119, absent: 13 },
      ],
      risk_students: [
        { name: 'Camila Ruiz', reasons: ['Faltas reiteradas', '2 entregas pendientes'], status: 'Seguimiento' },
        { name: 'Lucas Vidal', reasons: ['Nota parcial baja'], status: 'Reforzar' },
        { name: 'Marta Pérez', reasons: ['Sin rendir parcial', 'Faltas'], status: 'Contactar' },
      ],
      tp_tracking: {
        pending: [
          { title: 'TP2 · Algoritmos', owner: 'S. Morales', due: 'Mañana' },
          { title: 'TP3 · Simulación', owner: 'P. Díaz', due: 'Vie 18' },
        ],
        assigned: [
          { title: 'TP1 · Modelado', owner: 'N. López', due: 'En revisión' },
        ],
        reviewing: [
          { title: 'TP4 · Optimización', owner: 'Equipo senior', due: 'Corrección' },
        ],
      },
      support_inbox: [
        { subject: 'Consulta sobre parcial 2', status: 'Nueva', assignee: 'Sin asignar', requester: 'A. Gomez', updated_at: '2024-08-12 10:45' },
        { subject: 'Revisión nota TP1', status: 'En proceso', assignee: 'L. Salvatierra', requester: 'M. Pereyra', updated_at: '2024-08-11 15:20' },
        { subject: 'Certificado de cursada', status: 'Resuelta', assignee: 'G. Font', requester: 'F. Ortiz', updated_at: '2024-08-10 09:05' },
      ],
      quick_access: [
        { label: 'Plan de clases y temario', href: '#plan', roles: 'Gurú/Senior' },
        { label: 'Materiales del curso', href: '#materiales', roles: 'Gurú/Senior/Ayudante' },
        { label: 'Carga de resultados', href: '#resultados', roles: 'Gurú/Senior' },
        { label: 'Exportar CSV', href: '#exportar', roles: 'Gurú/Senior' },
        { label: 'Gestión de comisión', href: '#comision', roles: 'Gurú' },
      ],
    };
  }

  function loadModulePreferences() {
    try {
      const raw = window.localStorage.getItem(MODULE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn('No se pudieron cargar las preferencias de módulos.', err);
      return {};
    }
  }

  function saveModulePreferences(prefs) {
    window.localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(prefs));
  }

  function applyModuleVisibility(prefs) {
    moduleConfig.forEach(module => {
      const section = document.querySelector(`[data-module="${module.id}"]`);
      if (!section) return;
      const visible = prefs[module.id] !== false;
      section.classList.toggle('is-hidden', !visible);
    });
  }

  function renderModuleToggles() {
    const prefs = loadModulePreferences();
    els.moduleToggles.innerHTML = moduleConfig.map(module => {
      const checked = prefs[module.id] !== false;
      return `
        <label class="module-toggle">
          <input type="checkbox" data-module-toggle="${module.id}" ${checked ? 'checked' : ''} />
          <div>
            <h4>${module.label}</h4>
            <p>${module.description}</p>
          </div>
        </label>
      `;
    }).join('');
    applyModuleVisibility(prefs);
  }

  async function loadDashboard() {
    const query = new URLSearchParams({
      course_id: state.courseId,
      term: state.filters.term || '',
      topic: state.filters.topic || '',
    });
    try {
      const data = await api.get(`/curso-dashboard/config?${query.toString()}`);
      state.permissions = data.permissions;
      state.schedules = data.schedules || [];
      state.keyDates = data.key_dates || [];
      state.announcements = data.announcements || [];
      state.analytics = data.analytics || getDefaultAnalytics();
      renderFilters(data.filters || {});
      renderSummary(data.summary || {});
      renderAnalytics();
      renderSchedules();
      renderKeyDates();
      renderTeam(data.team || []);
      renderAnnouncements();
      toggleActions();
    } catch (err) {
      renderSummary({});
      state.analytics = getDefaultAnalytics();
      renderAnalytics();
      renderSchedules(true);
      renderKeyDates(true);
      renderTeam([]);
      renderAnnouncements(true);
      console.error(err);
      alert('No se pudo cargar el dashboard: ' + err.message);
    }
  }

  function toggleActions() {
    const canEdit = state.permissions?.can_edit;
    els.addScheduleBtn.classList.toggle('is-hidden', !canEdit);
    els.addKeyDateBtn.classList.toggle('is-hidden', !canEdit);
    els.addAnnouncementBtn.classList.toggle('is-hidden', !(canEdit || state.permissions?.can_draft));
    scheduleForm.publishField.classList.toggle('is-hidden', !state.permissions?.can_publish);
    keyDateForm.publishField.classList.toggle('is-hidden', !state.permissions?.can_publish);
    announcementForm.status.disabled = !state.permissions?.can_publish;
    announcementForm.pinned.disabled = !state.permissions?.can_publish;
  }

  function renderFilters(filters) {
    const terms = filters.terms || [];
    const topics = filters.topics || [];

    els.filterTerm.innerHTML = `<option value="">Todo</option>` + terms.map(term => {
      const label = term === 1 ? '1º Cuatrimestre' : term === 2 ? '2º Cuatrimestre' : `Cuatrimestre ${term}`;
      return `<option value="${term}">${label}</option>`;
    }).join('');
    els.filterTopic.innerHTML = `<option value="">Todos</option>` + topics.map(topic => `<option value="${topic}">${topic}</option>`).join('');

    if (state.filters.term) els.filterTerm.value = state.filters.term;
    if (state.filters.topic) els.filterTopic.value = state.filters.topic;
  }

  function renderSummary(summary) {
    const nextClass = summary.next_class;
    const nextKey = summary.next_key_date;
    const approvalRate = summary.approval_rate;
    const tp = summary.tp_deliveries || {};
    const inquiries = summary.pending_inquiries ?? 0;

    const cards = [
      {
        title: 'Próxima clase',
        value: nextClass
          ? `${dayLabels[nextClass.day_of_week] || nextClass.day_of_week} ${formatDate(nextClass.next_date)}`
          : 'Sin próxima clase',
        meta: nextClass
          ? `${formatTime(nextClass.start_time)} - ${formatTime(nextClass.end_time)} · ${nextClass.modality}${nextClass.location ? ` · ${nextClass.location}` : ''}`
          : 'Agendá el horario regular',
      },
      {
        title: 'Próxima fecha clave',
        value: nextKey ? `${kindLabels[nextKey.kind] || nextKey.kind}` : 'Sin fechas próximas',
        meta: nextKey ? `${nextKey.title} · ${formatDate(nextKey.date)}${nextKey.time ? ` ${formatTime(nextKey.time)}` : ''}` : 'Cargá parciales y entregas',
      },
      {
        title: '% de aprobación',
        value: approvalRate !== null && approvalRate !== undefined ? `${approvalRate}%` : 'Sin datos',
        meta: 'Calculado según filtros activos',
      },
      {
        title: 'Entregas de TP',
        value: `${tp.delivered ?? 0} / ${tp.total ?? 0}`,
        meta: `${tp.pending ?? 0} pendientes`,
      },
      {
        title: 'Consultas pendientes',
        value: String(inquiries),
        meta: 'Pendientes de respuesta',
      },
    ];

    els.summaryGrid.innerHTML = cards.map(card => `
      <div class="card summary-card">
        <div class="summary-label">${card.title}</div>
        <div class="summary-value">${card.value}</div>
        <div class="muted-block">${card.meta}</div>
      </div>
    `).join('');
  }

  function renderAnalytics() {
    const analytics = state.analytics || getDefaultAnalytics();
    const approval = analytics.approval_breakdown || { approved: 0, failed: 0, absent: 0 };
    const approvalTotal = (approval.approved || 0) + (approval.failed || 0) + (approval.absent || 0);
    const calcPercent = value => approvalTotal ? Math.round((value / approvalTotal) * 100) : 0;
    const approvedPct = calcPercent(approval.approved || 0);
    const failedPct = calcPercent(approval.failed || 0);
    const absentPct = calcPercent(approval.absent || 0);

    els.approvalBreakdown.innerHTML = `
      <span class="approved" style="width:${approvedPct}%"></span>
      <span class="failed" style="width:${failedPct}%"></span>
      <span class="absent" style="width:${absentPct}%"></span>
    `;
    els.approvalLegend.innerHTML = `
      <span><i style="background:color-mix(in oklab, #16a34a 75%, var(--surface))"></i>Aprobados ${approvedPct}%</span>
      <span><i style="background:color-mix(in oklab, #f97316 75%, var(--surface))"></i>Desaprobados ${failedPct}%</span>
      <span><i style="background:color-mix(in oklab, #e11d48 75%, var(--surface))"></i>Ausentes ${absentPct}%</span>
    `;

    const topics = analytics.approval_by_topic || [];
    if (topics.length === 0) {
      els.topicApprovalList.innerHTML = '<div class="muted-block">No hay datos por tema todavía.</div>';
    } else {
      els.topicApprovalList.innerHTML = topics.map(topic => `
        <button class="topic-bar" data-topic="${topic.topic}">
          <div class="topic-label">${topic.topic}</div>
          <div class="bar"><span style="width:${topic.approval_rate}%"></span></div>
          <div class="topic-meta">${topic.approval_rate}% · ${topic.total} rindieron</div>
        </button>
      `).join('');
    }

    const grades = analytics.grade_distribution || [];
    if (grades.length === 0) {
      els.gradeHistogram.innerHTML = '<div class="muted-block">Sin distribución disponible.</div>';
    } else {
      const maxCount = Math.max(...grades.map(item => item.count || 0), 1);
      els.gradeHistogram.innerHTML = grades.map(item => `
        <div class="histogram-row">
          <div>${item.range}</div>
          <div class="bar"><span style="width:${Math.round(((item.count || 0) / maxCount) * 100)}%"></span></div>
          <div class="topic-meta">${item.count}</div>
        </div>
      `).join('');
    }

    const historical = analytics.historical_terms || [];
    if (historical.length === 0) {
      els.historyTrends.innerHTML = '<div class="muted-block">Sin histórico disponible.</div>';
      els.historyTableBody.innerHTML = '<tr><td colspan="4" class="muted-block">No hay datos registrados.</td></tr>';
    } else {
      els.historyTrends.innerHTML = historical.map(term => `
        <div class="trend-card">
          <strong>${term.term}</strong>
          <div class="mini-bar"><span style="width:${term.approval_rate}%"></span></div>
          <div class="trend-metrics">
            <span>Aprobación ${term.approval_rate}%</span>
            <span>Promedio ${term.average_grade}</span>
            <span>Deserción ${Math.max(0, term.enrolled - term.took_exam)} estudiantes</span>
          </div>
        </div>
      `).join('');
      els.historyTableBody.innerHTML = historical.map(term => `
        <tr>
          <td>${term.term}</td>
          <td>${term.approval_rate}%</td>
          <td>${term.average_grade}</td>
          <td>${term.absent}</td>
        </tr>
      `).join('');
    }

    const risk = analytics.risk_students || [];
    els.riskList.innerHTML = risk.length
      ? risk.map(student => `
          <div class="item-row">
            <div class="item-meta">
              <div class="item-title">${student.name}</div>
              <div class="risk-reasons">
                ${(student.reasons || []).map(reason => `<span class="badge">${reason}</span>`).join('')}
              </div>
            </div>
            <span class="pill">${student.status}</span>
          </div>
        `).join('')
      : '<div class="muted-block">No hay alumnos en riesgo detectados.</div>';

    const tp = analytics.tp_tracking || {};
    const renderTpColumn = (title, items) => `
      <div class="kanban-column">
        <h4>${title}</h4>
        ${(items || []).map(item => `
          <div class="kanban-card">
            <strong>${item.title}</strong>
            <span class="topic-meta">Asignado: ${item.owner}</span>
            <span class="topic-meta">${item.due}</span>
          </div>
        `).join('') || '<div class="muted-block">Sin elementos</div>'}
      </div>
    `;
    els.tpTracking.innerHTML = `
      ${renderTpColumn('Mis pendientes', tp.pending)}
      ${renderTpColumn('Asignados', tp.assigned)}
      ${renderTpColumn('En corrección', tp.reviewing)}
    `;

    const inbox = analytics.support_inbox || [];
    els.supportInbox.innerHTML = inbox.length
      ? inbox.map(item => {
          const statusClass = item.status === 'Nueva'
            ? 'badge primary'
            : item.status === 'En proceso'
              ? 'badge'
              : 'badge';
          return `
            <div class="item-row">
              <div class="item-meta">
                <div class="item-title">${item.subject}</div>
                <div class="muted-block">${item.requester} · Actualizado ${formatDateTime(item.updated_at)}</div>
                <div class="muted-block">Asignado a: ${item.assignee}</div>
              </div>
              <span class="${statusClass}">${item.status}</span>
            </div>
          `;
        }).join('')
      : '<div class="muted-block">No hay consultas en la bandeja.</div>';

    const quick = analytics.quick_access || [];
    els.quickAccessList.innerHTML = quick.map(item => `
      <a href="${item.href}">
        <span>${item.label}</span>
        <span class="pill">${item.roles}</span>
      </a>
    `).join('');
  }


  function renderSchedules(isEmpty = false) {
    if (isEmpty || state.schedules.length === 0) {
      els.scheduleList.innerHTML = `<div class="muted-block">No hay horarios cargados todavía.</div>`;
      return;
    }
    els.scheduleList.innerHTML = state.schedules.map(schedule => `
      <div class="item-row">
        <div class="item-meta">
          <div class="item-title">${dayLabels[schedule.day_of_week] || schedule.day_of_week} · ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}</div>
          <div class="muted-block">${schedule.modality || ''}${schedule.location ? ` · ${schedule.location}` : ''}</div>
          ${schedule.notes ? `<div class="muted-block">${schedule.notes}</div>` : ''}
          ${schedule.is_published ? '' : '<span class="badge">Borrador</span>'}
        </div>
        <div class="item-actions">
          <button type="button" data-action="history" data-type="schedule" data-id="${schedule.id}">Historial</button>
          ${state.permissions.can_edit ? `<button type="button" data-action="edit-schedule" data-id="${schedule.id}">Editar</button>` : ''}
          ${state.permissions.can_delete ? `<button type="button" data-action="delete-schedule" data-id="${schedule.id}">Eliminar</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderKeyDates(isEmpty = false) {
    if (isEmpty || state.keyDates.length === 0) {
      els.keyDateList.innerHTML = `<div class="muted-block">No hay fechas clave registradas.</div>`;
      return;
    }
    els.keyDateList.innerHTML = state.keyDates.map(item => `
      <div class="item-row">
        <div class="item-meta">
          <div class="item-title">${item.title}</div>
          <div class="muted-block">${kindLabels[item.kind] || item.kind} · ${formatDate(item.date)}${item.time ? ` ${formatTime(item.time)}` : ''}</div>
          <div class="muted-block">${item.term ? `Cuatrimestre ${item.term}` : ''}${item.term && item.topic ? ' · ' : ''}${item.topic ? `Tema ${item.topic}` : ''}</div>
          ${item.notes ? `<div class="muted-block">${item.notes}</div>` : ''}
          ${item.is_published ? '' : '<span class="badge">Borrador</span>'}
        </div>
        <div class="item-actions">
          <button type="button" data-action="history" data-type="key_date" data-id="${item.id}">Historial</button>
          ${state.permissions.can_edit ? `<button type="button" data-action="edit-key-date" data-id="${item.id}">Editar</button>` : ''}
          ${state.permissions.can_delete ? `<button type="button" data-action="delete-key-date" data-id="${item.id}">Eliminar</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function renderTeam(team) {
    if (!team.length) {
      els.teamList.innerHTML = `<div class="muted-block">No hay integrantes cargados en esta comisión.</div>`;
      return;
    }
    els.teamList.innerHTML = team.map(member => {
      const initials = `${member.name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
      const email = member.email || member.personal_email || '';
      const primaryRole = member.primary_role || (member.roles || '').split(',').filter(Boolean)[0] || '';
      const roleClass = primaryRole === 'GURU'
        ? 'role-pill--guru'
        : primaryRole === 'SENIOR'
          ? 'role-pill--senior'
          : primaryRole === 'AYUDANTE'
            ? 'role-pill--ayudante'
            : '';
      const avatar = member.photo_url
        ? `<img src="${member.photo_url}" alt="Foto de ${member.name || ''} ${member.last_name || ''}">`
        : (initials || '👤');
      return `
        <div class="item-row team-card">
          <div class="team-avatar">${avatar}</div>
          <div class="item-title">${member.name || ''} ${member.last_name || ''}</div>
          <div class="team-role">${primaryRole ? `<span class="role-pill ${roleClass}">${primaryRole}</span>` : ''}</div>
          ${email ? `<div class="team-email">${email}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderAnnouncements(isEmpty = false) {
    if (isEmpty || state.announcements.length === 0) {
      els.announcementList.innerHTML = `<div class="muted-block">No hay anuncios publicados.</div>`;
      return;
    }
    els.announcementList.innerHTML = state.announcements.map(item => {
      const statusClass = item.status === 'DRAFT' ? 'draft' : 'published';
      return `
        <div class="item-row">
          <div class="item-meta">
            <div class="item-title">${item.title}</div>
            <div class="muted-block">
              ${item.is_pinned ? '<span class="badge primary">Fijado</span>' : ''}
              <span class="status-pill ${statusClass}">${item.status === 'DRAFT' ? 'Borrador' : 'Publicado'}</span>
            </div>
            ${item.reminder_at ? `<div class="muted-block">Recordatorio: ${formatDateTime(item.reminder_at)}</div>` : ''}
            ${(item.starts_at || item.ends_at) ? `<div class="muted-block">Visible: ${item.starts_at ? formatDateTime(item.starts_at) : 'ahora'} → ${item.ends_at ? formatDateTime(item.ends_at) : 'sin fin'}</div>` : ''}
            ${item.body ? `<div class="announcement-body">${item.body}</div>` : ''}
          </div>
          <div class="item-actions">
            ${(state.permissions.can_edit || state.permissions.can_draft) ? `<button type="button" data-action="edit-announcement" data-id="${item.id}">Editar</button>` : ''}
            ${(state.permissions.can_delete || state.permissions.can_draft) ? `<button type="button" data-action="delete-announcement" data-id="${item.id}">Eliminar</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function setScheduleForm(data) {
    scheduleForm.id = data?.id || null;
    scheduleForm.day.value = data?.day_of_week || 'LUN';
    scheduleForm.modality.value = data?.modality || 'PRESENCIAL';
    scheduleForm.start.value = formatTime(data?.start_time || '');
    scheduleForm.end.value = formatTime(data?.end_time || '');
    scheduleForm.location.value = data?.location || '';
    scheduleForm.notes.value = data?.notes || '';
    scheduleForm.publish.checked = data?.is_published ? true : false;
  }

  function setKeyDateForm(data) {
    keyDateForm.id = data?.id || null;
    keyDateForm.kind.value = data?.kind || 'OTRO';
    keyDateForm.title.value = data?.title || '';
    keyDateForm.date.value = data?.date || '';
    keyDateForm.time.value = formatTime(data?.time || '');
    keyDateForm.term.value = data?.term || '';
    keyDateForm.topic.value = data?.topic || '';
    keyDateForm.notes.value = data?.notes || '';
    keyDateForm.publish.checked = data?.is_published ? true : false;
  }

  function setAnnouncementForm(data) {
    announcementForm.id = data?.id || null;
    announcementForm.title.value = data?.title || '';
    announcementForm.body.value = data?.body || '';
    announcementForm.reminder.value = toInputDateTime(data?.reminder_at || '');
    announcementForm.status.value = data?.status || 'PUBLISHED';
    announcementForm.start.value = toInputDateTime(data?.starts_at || '');
    announcementForm.end.value = toInputDateTime(data?.ends_at || '');
    announcementForm.pinned.checked = data?.is_pinned ? true : false;
  }

  async function saveSchedule() {
    const payload = {
      id: scheduleForm.id,
      course_id: state.courseId,
      day_of_week: scheduleForm.day.value,
      modality: scheduleForm.modality.value,
      start_time: scheduleForm.start.value,
      end_time: scheduleForm.end.value,
      location: scheduleForm.location.value.trim(),
      notes: scheduleForm.notes.value.trim(),
      is_published: scheduleForm.publish.checked ? 1 : 0,
    };
    await api.post('/curso-dashboard/schedules/save', payload);
    closeModal(els.scheduleModal);
    await loadDashboard();
  }

  async function saveKeyDate() {
    const payload = {
      id: keyDateForm.id,
      course_id: state.courseId,
      kind: keyDateForm.kind.value,
      title: keyDateForm.title.value.trim(),
      date: keyDateForm.date.value,
      time: keyDateForm.time.value,
      term: keyDateForm.term.value,
      topic: keyDateForm.topic.value.trim(),
      notes: keyDateForm.notes.value.trim(),
      is_published: keyDateForm.publish.checked ? 1 : 0,
    };
    await api.post('/curso-dashboard/key-dates/save', payload);
    closeModal(els.keyDateModal);
    await loadDashboard();
  }

  async function saveAnnouncement() {
    const payload = {
      id: announcementForm.id,
      course_id: state.courseId,
      title: announcementForm.title.value.trim(),
      body: announcementForm.body.value.trim(),
      reminder_at: announcementForm.reminder.value,
      status: announcementForm.status.value,
      starts_at: announcementForm.start.value,
      ends_at: announcementForm.end.value,
      is_pinned: announcementForm.pinned.checked ? 1 : 0,
    };
    await api.post('/curso-dashboard/announcements/save', payload);
    closeModal(els.announcementModal);
    await loadDashboard();
  }

  async function loadHistory(type, id) {
    const query = new URLSearchParams({ course_id: state.courseId, type, id });
    const data = await api.get(`/curso-dashboard/history?${query.toString()}`);
    if (!data.history || data.history.length === 0) {
      els.historyList.innerHTML = '<div class="muted-block">No hay historial disponible.</div>';
      return;
    }
    els.historyList.innerHTML = data.history.map(entry => {
      const userName = `${entry.name || ''} ${entry.last_name || ''}`.trim() || 'Sistema';
      const actionLabel = entry.action === 'CREATED' ? 'Creado' : entry.action === 'UPDATED' ? 'Actualizado' : 'Eliminado';
      return `
        <div class="item-row">
          <div class="item-meta">
            <div class="item-title">${actionLabel} · ${formatDateTime(entry.changed_at)}</div>
            <div class="muted-block">${userName}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function handleListClick(event) {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);
    if (action === 'edit-schedule') {
      const item = state.schedules.find(s => s.id === id);
      setScheduleForm(item);
      els.scheduleModalTitle.textContent = 'Editar horario';
      openModal(els.scheduleModal);
      return;
    }
    if (action === 'delete-schedule') {
      if (!confirm('¿Eliminar este horario?')) return;
      api.post('/curso-dashboard/schedules/delete', { id, course_id: state.courseId }).then(loadDashboard);
      return;
    }
    if (action === 'edit-key-date') {
      const item = state.keyDates.find(s => s.id === id);
      setKeyDateForm(item);
      els.keyDateModalTitle.textContent = 'Editar fecha clave';
      openModal(els.keyDateModal);
      return;
    }
    if (action === 'delete-key-date') {
      if (!confirm('¿Eliminar esta fecha clave?')) return;
      api.post('/curso-dashboard/key-dates/delete', { id, course_id: state.courseId }).then(loadDashboard);
      return;
    }
    if (action === 'edit-announcement') {
      const item = state.announcements.find(s => s.id === id);
      setAnnouncementForm(item);
      els.announcementModalTitle.textContent = 'Editar aviso';
      openModal(els.announcementModal);
      return;
    }
    if (action === 'delete-announcement') {
      if (!confirm('¿Eliminar este aviso?')) return;
      api.post('/curso-dashboard/announcements/delete', { id, course_id: state.courseId }).then(loadDashboard);
      return;
    }
    if (action === 'history') {
      els.historyModalTitle.textContent = 'Historial de cambios';
      openModal(els.historyModal);
      loadHistory(btn.dataset.type === 'schedule' ? 'schedule' : 'key_date', id);
    }
  }

  function initEvents() {
    els.filterTerm.addEventListener('change', () => {
      state.filters.term = els.filterTerm.value;
      loadDashboard();
    });
    els.filterTopic.addEventListener('change', () => {
      state.filters.topic = els.filterTopic.value;
      loadDashboard();
    });
    els.refreshBtn.addEventListener('click', loadDashboard);
    els.clearTopicFilter.addEventListener('click', () => {
      state.filters.topic = '';
      els.filterTopic.value = '';
      loadDashboard();
    });

    els.addScheduleBtn.addEventListener('click', () => {
      setScheduleForm({});
      els.scheduleModalTitle.textContent = 'Nuevo horario';
      openModal(els.scheduleModal);
    });
    els.addKeyDateBtn.addEventListener('click', () => {
      setKeyDateForm({});
      els.keyDateModalTitle.textContent = 'Nueva fecha clave';
      openModal(els.keyDateModal);
    });
    els.addAnnouncementBtn.addEventListener('click', () => {
      setAnnouncementForm({});
      els.announcementModalTitle.textContent = 'Nuevo aviso';
      openModal(els.announcementModal);
    });

    scheduleForm.cancel.addEventListener('click', () => closeModal(els.scheduleModal));
    keyDateForm.cancel.addEventListener('click', () => closeModal(els.keyDateModal));
    announcementForm.cancel.addEventListener('click', () => closeModal(els.announcementModal));
    document.getElementById('historyClose').addEventListener('click', () => closeModal(els.historyModal));

    scheduleForm.save.addEventListener('click', () => saveSchedule().catch(err => alert(err.message)));
    keyDateForm.save.addEventListener('click', () => saveKeyDate().catch(err => alert(err.message)));
    announcementForm.save.addEventListener('click', () => saveAnnouncement().catch(err => alert(err.message)));

    els.scheduleList.addEventListener('click', handleListClick);
    els.keyDateList.addEventListener('click', handleListClick);
    els.announcementList.addEventListener('click', handleListClick);
    els.moduleToggles.addEventListener('change', event => {
      const input = event.target.closest('input[data-module-toggle]');
      if (!input) return;
      const prefs = loadModulePreferences();
      prefs[input.dataset.moduleToggle] = input.checked;
      saveModulePreferences(prefs);
      applyModuleVisibility(prefs);
    });
    els.topicApprovalList.addEventListener('click', event => {
      const button = event.target.closest('button[data-topic]');
      if (!button) return;
      const topic = button.dataset.topic;
      state.filters.topic = topic;
      els.filterTopic.value = topic;
      loadDashboard();
    });
  }

  async function init() {
    state.courseId = await window.courseContext.require();
    if (typeof renderMenu === 'function') {
      renderMenu();
    }
    initEvents();
    renderModuleToggles();
    await loadDashboard();
  }

  init().catch(err => {
    console.error(err);
    alert('No se pudo inicializar el dashboard: ' + err.message);
  });
})();