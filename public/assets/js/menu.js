(function () {
  function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[m]));
  }
  function item(href, label) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const normalizedHref = href.replace(/\/index\.html?$/i, '/').toLowerCase();
    const active = here.startsWith(normalizedHref);
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  }
  function isActivePath(href) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const normalizedHref = href.replace(/\/index\.html?$/i, '/').toLowerCase();
    return here.startsWith(normalizedHref);
  }
  function menuGroup(label, items = []) {
    const visibleItems = items.filter(menuItem => menuItem && menuItem.href && menuItem.label);
    if (!visibleItems.length) return '';
    const anyActive = visibleItems.some(menuItem => isActivePath(menuItem.href));
    const openAttr = anyActive ? ' open' : '';
    const links = visibleItems.map(menuItem => item(menuItem.href, menuItem.label)).join('');
    return `
      <details class="menu-group"${openAttr}>
        <summary class="menu-group__summary ${anyActive ? 'active' : ''}">
          <span>${label}</span>
          <span class="menu-group__chevron">▾</span>
        </summary>
        <div class="menu-group__items">
          ${links}
        </div>
      </details>`;
  }
  window.renderMenu = async function (containerId = 'appMenu') {
    const page = (path) => window.getPageRoute ? window.getPageRoute(path) : (BASE_APP + `/pages/${path}/`);
    let isGuru = false;
     let isSenior = false;
    let me = null;
    if (api.getToken()) {
      try {
        me = await api.get('/me');
        isGuru = Array.isArray(me.roles) && me.roles.includes('GURU');
        isSenior = Array.isArray(me.roles) && me.roles.includes('SENIOR');
      } catch (e) {
        isGuru = false;
        isSenior = false;
      }
    }
    const displayName = me ? `${me.name || ''}${me.last_name ? ' ' + me.last_name : ''}`.trim() : '';
    const initials = displayName
      ? displayName.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
      : (me?.username ? me.username.slice(0, 2).toUpperCase() : '');
    const profile = me ? `
      <a class="menu-profile" href="${page('perfil')}" title="Mi perfil">
        ${me.photo_url
          ? `<img class="menu-avatar" src="${me.photo_url}" alt="Foto de ${escapeHtml(displayName)}">`
          : `<span class="menu-avatar menu-avatar--fallback">${escapeHtml(initials)}</span>`}
        <span class="menu-profile-name">${escapeHtml(displayName || me.username || '')}</span>
      </a>` : '';
    const html = `
      <div class="menu">
        ${item(page('home'), 'Home')}
        ${item(page('planificacion'), 'Planificación')}
        ${menuGroup('Dashboard', [
          { href: page('cursoDashboard'), label: 'Dashboard' },
          { href: page('reportes'), label: 'Novedades/Reportes' }
        ])}
        ${menuGroup('Estudiantes', [
          { href: page('estudiantes'), label: 'Estudiantes' },
          { href: page('grupos'), label: 'Grupos' }
        ])}
        ${item(page('entregas'), 'Trabajos Prácticos')}
        ${menuGroup('Parciales', [
          { href: page('parciales'), label: 'Parciales' },
          { href: page('asistencia'), label: 'Asistencia' },
          (isGuru || isSenior) ? { href: page('notas-finales'), label: 'Calificación final' } : null
        ])}
        
        <div class="spacer"></div>
        <button class="btn btn-ghost round" onclick="theme.toggle()">🌓 Modo</button>
        ${profile}
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = page('home');
    }); const groups = Array.from(document.querySelectorAll('.menu-group'));
    const closeOtherGroups = (current) => {
      groups.forEach(group => {
        if (group !== current) {
          group.removeAttribute('open');
        }
      });
    };
    groups.forEach(group => {
      group.addEventListener('toggle', () => {
        if (group.open) {
          closeOtherGroups(group);
        }
      });
      group.addEventListener('mouseenter', () => {
        group.setAttribute('open', '');
        closeOtherGroups(group);
      });
      group.addEventListener('mouseleave', () => {
        group.removeAttribute('open');
      });
    });
  };
})();