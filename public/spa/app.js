import { renderLayout } from './components/layout.js';
import { initRouter } from './router.js';
import { routes } from './store.js';

const root = document.getElementById('app');
root.innerHTML = renderLayout();

const appView = document.getElementById('appView');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const logoutTop = document.getElementById('logoutTop');
const themeToggle = document.getElementById('themeToggle');
const menuEl = document.getElementById('appMenu');

const escapeHtml = (s) => (s || '').toString().replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[m]));

async function renderMenu(activeRoute) {
  if (activeRoute === 'login') {
    menuEl.innerHTML = '<div class="menu-profile">Ingresá para continuar</div>';
    return;
  }

  let isGuru = false;
  let me = null;
  if (api.getToken()) {
    try {
      me = await api.get('/me');
      isGuru = Array.isArray(me.roles) && me.roles.includes('GURU');
    } catch (e) {
      isGuru = false;
    }
  }

  const items = [
    { key: 'home', label: 'Home' },
    { key: 'curso-dashboard', label: 'Dashboard' },
    { key: 'planificacion', label: 'Planificación' },
    { key: 'estudiantes', label: 'Estudiantes' },
    { key: 'grupos', label: 'Grupos' },
    { key: 'entregas', label: 'Trabajos Prácticos' },
    { key: 'parciales', label: 'Parciales' },
    { key: 'asistencia', label: 'Asistencia' },
    { key: 'reportes', label: 'Reportes' },
  ];

  const links = items.map((item) => {
    const active = activeRoute === item.key;
    return `<a href="#/${item.key}" class="${active ? 'active' : ''}">${escapeHtml(item.label)}</a>`;
  }).join('');

  const displayName = me ? `${me.name || ''}${me.last_name ? ' ' + me.last_name : ''}`.trim() : '';
  const initials = displayName
    ? displayName.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
    : (me?.username ? me.username.slice(0, 2).toUpperCase() : '');

  const profile = me ? `
    <div class="menu-profile">
      ${me.photo_url
        ? `<img class="menu-avatar" src="${me.photo_url}" alt="Foto de ${escapeHtml(displayName)}">`
        : `<span class="menu-avatar menu-avatar--fallback">${escapeHtml(initials)}</span>`}
      <div>
        <div>${escapeHtml(displayName || me.username || '')}</div>
        <small>${isGuru ? 'GURÚ' : 'Docente'}</small>
      </div>
    </div>` : '';

  const adminLinks = isGuru ? `
    <a href="#/alumnos-global">Alumnos globales</a>
    <a href="#/cursos-admin">Administrar cursos</a>
    <a href="#/usuarios-admin">Administrar usuarios</a>` : '';

  menuEl.innerHTML = `
    ${links}
    ${adminLinks}
    ${profile}
  `;
}

window.renderMenu = renderMenu;

function updateHeader(route, meta, isNotFound) {
  if (isNotFound) {
    pageTitle.textContent = '404';
    pageSubtitle.textContent = 'Vista no encontrada';
  } else if (meta) {
    pageTitle.textContent = meta.title;
    pageSubtitle.textContent = meta.subtitle || '';
  }
  document.body.classList.toggle('spa-auth', route === 'login');
  if (logoutTop) logoutTop.style.display = route === 'login' ? 'none' : '';
  renderMenu(route);
}

logoutTop?.addEventListener('click', () => {
  api.clearToken();
  courseContext.clear();
  window.appNavigate('#/login');
});

themeToggle?.addEventListener('click', () => theme.toggle());

initRouter({
  viewEl: appView,
  onRouteChange({ route, meta, isNotFound }) {
    updateHeader(route, meta, isNotFound);
  },
});

export { routes };
