import { routes, routeAliases } from './store.js';
import { renderNotFound } from './views/not-found.js';

const escapeHtml = (s) => (s || '').toString().replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[m]));

function normalizeRoute(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (routes[cleaned]) return cleaned;
  return routeAliases[cleaned] || null;
}

function resolveRouteFromHash() {
  const hash = location.hash || '';
  const cleaned = hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = cleaned.split('?');
  const route = normalizeRoute(pathPart);
  return { route, query: queryPart ? `?${queryPart}` : '' };
}

function mapLegacyTarget(target) {
  if (!target) return null;
  if (target.startsWith('http')) return target;
  if (target.startsWith('#')) return target;
  const [path, query = ''] = target.split('?');
  const match = path.match(/\/public\/pages\/([^\/]+)\/?$/) || path.match(/\/public\/pages\/([^\/]+)\//);
  let slug = match ? match[1] : path.replace(/^\.\.\//, '').replace(/^\//, '').replace(/\/$/, '');
  slug = routeAliases[slug] || slug;
  if (!routes[slug]) return '#/login';
  return `#/${slug}${query ? `?${query}` : ''}`;
}

function getSpaBase(pathname = location.pathname) {
  if (pathname.includes('/public/')) {
    return `${pathname.slice(0, pathname.indexOf('/public/'))}/public/spa/`;
  }
  if (pathname.includes('/pages/')) {
    return `${pathname.slice(0, pathname.indexOf('/pages/'))}/spa/`;
  }
  return '/spa/';
}

function redirectLegacyUrl() {
  const path = location.pathname;
  const match = path.match(/\/(?:public\/)?pages\/([^\/]+)\/?/);
  if (!match) return;
  const slug = routeAliases[match[1]] || match[1];
  const target = routes[slug] ? slug : 'login';
  const search = location.search || '';
  const spaBase = getSpaBase(path);
  location.replace(`${spaBase}#/${target}${search}`);
}

async function loadHtml(route, viewEl) {
  const meta = routes[route];
  if (!meta) return false;
  try {
    const res = await fetch(BASE_APP + meta.html);
    if (!res.ok) return false;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main');
    viewEl.innerHTML = main ? main.outerHTML : '<main><div class="card">Vista no disponible.</div></main>';
    return true;
  } catch (err) {
    return false;
  }
}

function swapPageStyle(route) {
  const meta = routes[route];
  const existing = document.getElementById('spa-page-style');
  if (meta?.style) {
    if (existing) {
      existing.href = BASE_APP + meta.style;
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'spa-page-style';
      link.href = BASE_APP + meta.style;
      document.head.appendChild(link);
    }
  } else if (existing) {
    existing.remove();
  }
}

function swapPageScript(route) {
  const meta = routes[route];
  const existing = document.getElementById('spa-page-script');
  if (existing) existing.remove();
  if (!meta?.script) return;
  const script = document.createElement('script');
  script.id = 'spa-page-script';
  script.src = BASE_APP + meta.script;
  document.body.appendChild(script);
}

function setLoading(viewEl) {
  viewEl.innerHTML = '<div class="spa-loading">Cargando vista...</div>';
}

export function initRouter({ viewEl, onRouteChange } = {}) {
  if (!viewEl) {
    throw new Error('Router requiere un contenedor de vista.');
  }

  redirectLegacyUrl();

  function updateMeta(route, meta, isNotFound) {
    const title = isNotFound ? '404' : meta?.title || 'SyPdN';
    document.title = `SyPdN — ${title}`;
    if (typeof onRouteChange === 'function') {
      onRouteChange({ route, meta, isNotFound });
    }
  }

  async function navigate(route, query = '') {
    const meta = routes[route];
    setLoading(viewEl);
    if (!meta) {
      viewEl.innerHTML = renderNotFound();
      updateMeta(route, null, true);
      return;
    }
    swapPageStyle(route);
    const loaded = await loadHtml(route, viewEl);
    if (!loaded) {
      viewEl.innerHTML = renderNotFound();
      updateMeta(route, null, true);
      return;
    }
    swapPageScript(route);
    updateMeta(route, meta, false);
    if (query) {
      const url = new URL(location.href);
      url.hash = `#/${route}${query}`;
      history.replaceState({}, '', url.toString());
    }
  }

  function ensureDefaultRoute() {
    if (location.hash) return;
    const route = api.getToken() ? 'home' : 'login';
    location.hash = `#/${route}`;
  }

  window.appNavigate = function (target) {
    if (!target) return;
    if (target.startsWith('http')) {
      location.href = target;
      return;
    }
    const hash = mapLegacyTarget(target);
    if (hash && hash.startsWith('#')) {
      location.hash = hash;
      return;
    }
    location.hash = `#/${target.replace(/^#\/?/, '')}`;
  };

  window.addEventListener('hashchange', () => {
    const { route, query } = resolveRouteFromHash();
    navigate(route || 'login', query);
  });

  ensureDefaultRoute();
  const { route, query } = resolveRouteFromHash();
  navigate(route || 'login', query);

  return { navigate };
}

export function describeLegacyRedirect(target) {
  const hash = mapLegacyTarget(target);
  return hash ? escapeHtml(hash) : '';
}
