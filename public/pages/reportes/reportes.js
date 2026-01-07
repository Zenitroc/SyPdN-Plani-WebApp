renderMenu();

const modal = document.getElementById('reportModal');
const btnOpen = document.getElementById('btnReport');
const btnCancel = document.getElementById('r_cancel');
const btnSend = document.getElementById('r_send');
const resourcesGrid = document.getElementById('resourcesGrid');
const newsList = document.getElementById('newsList');
const resourceModal = document.getElementById('resourceModal');
const newsModal = document.getElementById('newsModal');
const btnAddResource = document.getElementById('btnAddResource');
const btnAddNews = document.getElementById('btnAddNews');
const btnResCancel = document.getElementById('res_cancel');
const btnResSave = document.getElementById('res_save');
const btnNewsCancel = document.getElementById('news_cancel');
const btnNewsSave = document.getElementById('news_save');

let reportesData = { resources: [], news: [] };
let isGuru = false;
let editingResourceId = null;
let editingNewsId = null;

function escapeHtml(text) {
  return (text || '').toString().replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[m]));
}

async function loadReportesData() {
  try {
    const data = await api.get('/reportes/config');
    return {
      resources: Array.isArray(data.resources) ? data.resources : [],
      news: Array.isArray(data.news) ? data.news : [],
    };
  } catch (err) {
    console.warn(err);
    return { resources: [], news: [] };
  }
}

function normalizeUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '#';
  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function renderResources(items) {
  if (!resourcesGrid) return;
  if (!items.length) {
    resourcesGrid.innerHTML = '<p class="muted">Todavía no hay recursos publicados.</p>';
    return;
  }
  resourcesGrid.innerHTML = items.map(item => {
    const title = escapeHtml(item.title || 'Recurso');
    const description = escapeHtml(item.description || '');
    const url = normalizeUrl(item.url);
    const icon = item.icon_image
      ? `<img src="${item.icon_image}" alt="${title}">`
      : `<span>${escapeHtml(item.icon_emoji || '🔗')}</span>`;
    const actions = isGuru
      ? `<div class="item-actions">
           <button type="button" data-action="edit-resource" data-id="${item.id}">✎</button>
           <button type="button" data-action="delete-resource" data-id="${item.id}">🗑</button>
         </div>`
      : '';
    return `
      <div class="resource-item">
        <a class="resource-link" href="${url}" target="_blank" rel="noopener">
          <span class="resource-icon">${icon}</span>
          <span>
            <div class="resource-meta">
              <div class="resource-title">${title}</div>
            </div>
            ${description ? `<div class="resource-desc">${description}</div>` : ''}
          </span>
        </a>
        ${actions}
      </div>`;
  }).join('');
}

function renderNews(items) {
  if (!newsList) return;
  if (!items.length) {
    newsList.innerHTML = '<p class="muted">Todavía no hay novedades publicadas.</p>';
    return;
  }
  newsList.innerHTML = items.map((item, idx) => {
    const title = escapeHtml(item.title || 'Novedad');
    const preview = escapeHtml(item.preview || '');
    const body = escapeHtml(item.body || '');
    const link = item.link ? normalizeUrl(item.link) : '';
    const linkLabel = escapeHtml(item.link_label || 'Ir al link');
    const image = item.image || '';
    const actions = isGuru
      ? `<span class="item-actions">
           <button type="button" data-action="edit-news" data-id="${item.id}">✎</button>
           <button type="button" data-action="delete-news" data-id="${item.id}">🗑</button>
         </span>`
      : '';
    return `
      <article class="news-item" data-news="${idx}">
        <button class="news-header" type="button" aria-expanded="false">
          <div>
            <div class="news-title">${title}</div>
            ${preview ? `<div class="news-preview">${preview}</div>` : ''}
          </div>
          <span class="news-toggle">+</span>
        </button>
        <div class="news-body">
          ${body ? `<p>${body}</p>` : ''}
          ${image ? `<img src="${image}" alt="${title}">` : ''}
          ${link ? `<a class="btn btn-neutral" href="${link}" target="_blank" rel="noopener">${linkLabel}</a>` : ''}
          ${actions}
        </div>
      </article>`;
  }).join('');
}

function bindNewsToggles() {
  if (!newsList) return;
  newsList.addEventListener('click', (event) => {
    const header = event.target.closest('.news-header');
    if (!header) return;
    const item = header.closest('.news-item');
    if (!item) return;
    const isOpen = item.classList.toggle('is-open');
    header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    const toggle = header.querySelector('.news-toggle');
    if (toggle) toggle.textContent = isOpen ? '−' : '+';
  });
}

function updateLists(nextData) {
  if (nextData) reportesData = nextData;
  renderResources(reportesData.resources || []);
  renderNews(reportesData.news || []);
}

function openResourceEditor(item) {
  editingResourceId = item?.id || null;
  document.getElementById('res_title').value = item?.title || '';
  document.getElementById('res_desc').value = item?.description || '';
  document.getElementById('res_url').value = item?.url || '';
  document.getElementById('res_emoji').value = item?.icon_emoji || '';
  document.getElementById('res_image').value = item?.icon_image || '';
  document.getElementById('res_image_file').value = '';
  resourceModal.style.display = 'flex';
}

function openNewsEditor(item) {
  editingNewsId = item?.id || null;
  document.getElementById('news_title').value = item?.title || '';
  document.getElementById('news_preview').value = item?.preview || '';
  document.getElementById('news_body').value = item?.body || '';
  document.getElementById('news_link').value = item?.link || '';
  document.getElementById('news_link_label').value = item?.link_label || '';
  document.getElementById('news_image').value = item?.image || '';
  document.getElementById('news_image_file').value = '';
  newsModal.style.display = 'flex';
}

btnOpen.addEventListener('click', () => { modal.style.display = 'flex'; });
btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });
btnResCancel.addEventListener('click', () => {
  editingResourceId = null;
  resourceModal.style.display = 'none';
});
btnNewsCancel.addEventListener('click', () => {
  editingNewsId = null;
  newsModal.style.display = 'none';
});

btnSend.addEventListener('click', async () => {
  const type = document.getElementById('r_type').value;
  const message = document.getElementById('r_message').value.trim();
  const link = document.getElementById('r_link').value.trim();
  const file = document.getElementById('r_image').files[0];

  let imageData = null;
  if (file) {
    imageData = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  try {
    await api.post('/reportes', { type, message, link, image: imageData });
    alert('Reporte enviado. ¡Gracias!');
    modal.style.display = 'none';
    document.getElementById('r_message').value = '';
    document.getElementById('r_link').value = '';
    document.getElementById('r_image').value = '';
  } catch (err) {
    alert('Error al enviar reporte: ' + err.message);
  }
});

bindNewsToggles();

btnAddResource?.addEventListener('click', () => {
  editingResourceId = null;
  openResourceEditor(null);
});
btnAddNews?.addEventListener('click', () => {
  editingNewsId = null;
  openNewsEditor(null);
});

resourcesGrid?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const action = button.dataset.action;
  const id = button.dataset.id;
  const item = (reportesData.resources || []).find((res) => String(res.id) === String(id));
  if (!item) return;
  if (action === 'edit-resource') {
    openResourceEditor(item);
  }
  if (action === 'delete-resource') {
    if (!confirm('¿Eliminar este recurso?')) return;
    try {
      await api.post('/reportes/resources/delete', { id: item.id });
      const data = await loadReportesData();
      updateLists(data);
    } catch (err) {
      alert('No se pudo eliminar el recurso: ' + err.message);
    }
  }
});

newsList?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const action = button.dataset.action;
  const id = button.dataset.id;
  const item = (reportesData.news || []).find((news) => String(news.id) === String(id));
  if (!item) return;
  if (action === 'edit-news') {
    openNewsEditor(item);
  }
  if (action === 'delete-news') {
    if (!confirm('¿Eliminar esta novedad?')) return;
    try {
      await api.post('/reportes/news/delete', { id: item.id });
      const data = await loadReportesData();
      updateLists(data);
    } catch (err) {
      alert('No se pudo eliminar la novedad: ' + err.message);
    }
  }
});

btnResSave?.addEventListener('click', async () => {
  const title = document.getElementById('res_title').value.trim();
  const description = document.getElementById('res_desc').value.trim();
  const url = document.getElementById('res_url').value.trim();
  const iconEmoji = document.getElementById('res_emoji').value.trim();
  const iconImage = document.getElementById('res_image').value.trim();
  const iconFile = document.getElementById('res_image_file').files[0];

  if (!title || !url) {
    alert('El nombre y la URL del recurso son obligatorios.');
    return;
  }

  let iconData = iconImage || null;
  if (iconFile) {
    iconData = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(iconFile);
    });
  }

  try {
    await api.post('/reportes/resources/save', {
      id: editingResourceId,
      title,
      description,
      url,
      icon_emoji: iconEmoji || null,
      icon_image: iconData,
    });
    const data = await loadReportesData();
    updateLists(data);
    resourceModal.style.display = 'none';
    editingResourceId = null;
  } catch (err) {
    alert('No se pudo guardar el recurso: ' + err.message);
    return;
  }
  document.getElementById('res_title').value = '';
  document.getElementById('res_desc').value = '';
  document.getElementById('res_url').value = '';
  document.getElementById('res_emoji').value = '';
  document.getElementById('res_image').value = '';
  document.getElementById('res_image_file').value = '';
});

btnNewsSave?.addEventListener('click', async () => {
  const title = document.getElementById('news_title').value.trim();
  const preview = document.getElementById('news_preview').value.trim();
  const body = document.getElementById('news_body').value.trim();
  const link = document.getElementById('news_link').value.trim();
  const linkLabel = document.getElementById('news_link_label').value.trim();
  const image = document.getElementById('news_image').value.trim();
  const imageFile = document.getElementById('news_image_file').files[0];

  if (!title) {
    alert('El título de la novedad es obligatorio.');
    return;
  }

  let imageData = image || null;
  if (imageFile) {
    imageData = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(imageFile);
    });
  }

  try {
    await api.post('/reportes/news/save', {
      id: editingNewsId,
      title,
      preview,
      body,
      link,
      link_label: linkLabel || null,
      image: imageData,
    });
    const data = await loadReportesData();
    updateLists(data);
    newsModal.style.display = 'none';
    editingNewsId = null;
  } catch (err) {
    alert('No se pudo guardar la novedad: ' + err.message);
    return;
  }
  document.getElementById('news_title').value = '';
  document.getElementById('news_preview').value = '';
  document.getElementById('news_body').value = '';
  document.getElementById('news_link').value = '';
  document.getElementById('news_link_label').value = '';
  document.getElementById('news_image').value = '';
  document.getElementById('news_image_file').value = '';
});

async function initReportes() {
  const data = await loadReportesData();
  updateLists(data);

  if (api.getToken()) {
    try {
      const me = await api.get('/me');
      isGuru = Array.isArray(me.roles) && me.roles.includes('GURU');
    } catch (err) {
      isGuru = false;
    }
  }
  if (isGuru) {
    btnAddResource?.classList.remove('is-hidden');
    btnAddNews?.classList.remove('is-hidden');
  }
  updateLists(reportesData);
}

initReportes();