(function () {
  function escapeHtml(s) {
    return (s || '').toString().replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
    }[m]));
  }
  function item(href, label) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const active = here.startsWith(href.toLowerCase());
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  }
  window.renderMenu = async function (containerId = 'appMenu') {
    const base = BASE_APP + '/public/pages';
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
      <a class="menu-profile" href="${base}/perfil/" title="Mi perfil">
        ${me.photo_url
          ? `<img class="menu-avatar" src="${me.photo_url}" alt="Foto de ${escapeHtml(displayName)}">`
          : `<span class="menu-avatar menu-avatar--fallback">${escapeHtml(initials)}</span>`}
        <span class="menu-profile-name">${escapeHtml(displayName || me.username || '')}</span>
      </a>` : '';
    const html = `
      <div class="menu">
        ${item(base + '/home/', 'Home')}
        ${item(base + '/curso-dashboard/', 'Dashboard')}
        ${item(base + '/planificacion/', 'Planificación')}
        ${item(base + '/estudiantes/', 'Estudiantes')}
        ${item(base + '/grupos/', 'Grupos')}
        ${item(base + '/entregas/', 'Trabajos Prácticos')}
        ${item(base + '/parciales/', 'Parciales')}
        ${item(base + '/asistencia/', 'Asistencia')}
        ${item(base + '/reportes/', 'Reportes')}
        
        <div class="spacer"></div>
        <button class="btn btn-ghost round" onclick="theme.toggle()">🌓 Modo</button>
        ${profile}
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = BASE_APP + '/public/pages/home/';
    });
  };
})();