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
  window.renderMenu = async function (containerId = 'appMenu') {
    const page = (path) => window.getPageRoute ? window.getPageRoute(path) : (BASE_APP + `/pages/${path}/`);
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
        ${item(page('cursoDashboard'), 'Dashboard')}
        ${item(page('planificacion'), 'Planificación')}
        ${item(page('estudiantes'), 'Estudiantes')}
        ${item(page('grupos'), 'Grupos')}
        ${item(page('entregas'), 'Trabajos Prácticos')}
        ${item(page('parciales'), 'Parciales')}
        ${item(page('asistencia'), 'Asistencia')}
        ${item(page('reportes'), 'Novedades/Reportes')}
        
        <div class="spacer"></div>
        <button class="btn btn-ghost round" onclick="theme.toggle()">🌓 Modo</button>
        ${profile}
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = page('home');
    });
  };
})();