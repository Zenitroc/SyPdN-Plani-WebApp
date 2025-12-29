(function () {
  function item(href, label) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const active = here.startsWith(href.toLowerCase());
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  }
  window.renderMenu = async function (containerId = 'appMenu') {
    const base = BASE_APP + '/public/pages';
    let isGuru = false;
    if (api.getToken()) {
      try {
        const me = await api.get('/me');
        isGuru = Array.isArray(me.roles) && me.roles.includes('GURU');
      } catch (e) {
        isGuru = false;
      }
    }
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
        
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = BASE_APP + '/public/pages/home/';
    });
  };
})();