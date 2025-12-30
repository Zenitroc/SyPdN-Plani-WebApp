(function () {
  const routes = {
    login: { title: 'Ingresar', subtitle: 'Acceso a la plataforma', html: '/public/pages/login/index.html', script: '/public/pages/login/login.js', style: '/public/pages/login/login.css' },
    home: { title: 'Home', subtitle: 'Resumen de comisiones', html: '/public/pages/home/index.html', script: '/public/pages/home/home.js' },
    'curso-dashboard': { title: 'Dashboard', subtitle: 'Indicadores del curso', html: '/public/pages/curso-dashboard/index.html', script: '/public/pages/curso-dashboard/dashboard.js' },
    planificacion: { title: 'Planificación', subtitle: 'Cronograma y objetivos', html: '/public/pages/planificacion/index.html', script: '/public/pages/planificacion/planificacion.js' },
    estudiantes: { title: 'Estudiantes', subtitle: 'Listado y seguimiento', html: '/public/pages/estudiantes/index.html', script: '/public/pages/estudiantes/estudiantes.js' },
    grupos: { title: 'Grupos', subtitle: 'Organización de equipos', html: '/public/pages/grupos/index.html', script: '/public/pages/grupos/grupos.js' },
    entregas: { title: 'Entregas', subtitle: 'Trabajos prácticos', html: '/public/pages/entregas/index.html', script: '/public/pages/entregas/entregas.js' },
    parciales: { title: 'Parciales', subtitle: 'Evaluaciones y notas', html: '/public/pages/parciales/index.html', script: '/public/pages/parciales/parciales.js' },
    asistencia: { title: 'Asistencia', subtitle: 'Registro de asistencia', html: '/public/pages/asistencia/index.html', script: '/public/pages/asistencia/asistencia.js' },
    reportes: { title: 'Reportes', subtitle: 'Reportes y análisis', html: '/public/pages/reportes/index.html', script: '/public/pages/reportes/reportes.js' },
    perfil: { title: 'Perfil', subtitle: 'Datos personales', html: '/public/pages/perfil/index.html', script: '/public/pages/perfil/perfil.js' },
    'alumnos-global': { title: 'Alumnos', subtitle: 'Vista global', html: '/public/pages/alumnos-global/index.html', script: '/public/pages/alumnos-global/global.js' },
    'cursos-admin': { title: 'Cursos', subtitle: 'Administración de cursos', html: '/public/pages/cursos-admin/index.html', script: '/public/pages/cursos-admin/cursos-admin.js' },
    'usuarios-admin': { title: 'Usuarios', subtitle: 'Administración de usuarios', html: '/public/pages/usuarios-admin/index.html', script: '/public/pages/usuarios-admin/usuarios-admin.js' },
  };

  const routeAliases = {
    alumnos: 'alumnos-global',
  };

  const appView = document.getElementById('appView');
  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const logoutTop = document.getElementById('logoutTop');
  const themeToggle = document.getElementById('themeToggle');
  const menuEl = document.getElementById('appMenu');

  const escapeHtml = (s) => (s || '').toString().replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
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

  async function renderMenu() {
    const activeRoute = resolveRouteFromHash().route;
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

  function setPageMeta(route) {
    const meta = routes[route];
    if (!meta) return;
    document.title = `SyPdN — ${meta.title}`;
    pageTitle.textContent = meta.title;
    pageSubtitle.textContent = meta.subtitle || '';
  }

  function setLoading() {
    appView.innerHTML = '<div class="spa-loading">Cargando vista...</div>';
  }

  async function loadHtml(route) {
    const meta = routes[route];
    if (!meta) return;
    const res = await fetch(BASE_APP + meta.html);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main');
    appView.innerHTML = main ? main.outerHTML : '<main><div class="card">Vista no disponible.</div></main>';
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

  async function navigate(route, query) {
    const meta = routes[route];
    if (!meta) {
      location.hash = '#/login';
      return;
    }
    setLoading();
    document.body.classList.toggle('spa-auth', route === 'login');
    if (logoutTop) logoutTop.style.display = route === 'login' ? 'none' : '';
    setPageMeta(route);
    swapPageStyle(route);
    await loadHtml(route);
    swapPageScript(route);
    renderMenu();
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

  window.addEventListener('hashchange', () => {
    const { route, query } = resolveRouteFromHash();
    navigate(route || 'login', query);
  });

  logoutTop?.addEventListener('click', () => {
    api.clearToken();
    courseContext.clear();
    window.appNavigate('#/login');
  });

  themeToggle?.addEventListener('click', () => theme.toggle());

  ensureDefaultRoute();
  const { route, query } = resolveRouteFromHash();
  navigate(route || 'login', query);
})();