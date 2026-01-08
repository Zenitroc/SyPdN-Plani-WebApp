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
    schedules: [],
    keyDates: [],
    announcements: [],
  };

  const els = {
    filterTerm: document.getElementById('filterTerm'),
    filterTopic: document.getElementById('filterTopic'),
    summaryGrid: document.getElementById('summaryGrid'),
    scheduleList: document.getElementById('scheduleList'),
    keyDateList: document.getElementById('keyDateList'),
    teamList: document.getElementById('teamList'),
    announcementList: document.getElementById('announcementList'),
    refreshBtn: document.getElementById('refreshBtn'),
    addScheduleBtn: document.getElementById('addScheduleBtn'),
    addKeyDateBtn: document.getElementById('addKeyDateBtn'),
    addAnnouncementBtn: document.getElementById('addAnnouncementBtn'),
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
      renderFilters(data.filters || {});
      renderSummary(data.summary || {});
      renderSchedules();
      renderKeyDates();
      renderTeam(data.team || []);
      renderAnnouncements();
      toggleActions();
    } catch (err) {
      renderSummary({});
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
  }

  async function init() {
    state.courseId = await window.courseContext.require();
    if (typeof renderMenu === 'function') {
      renderMenu();
    }
    initEvents();
    await loadDashboard();
  }

  init().catch(err => {
    console.error(err);
    alert('No se pudo inicializar el dashboard: ' + err.message);
  });
})();