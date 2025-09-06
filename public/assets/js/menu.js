(function () {
  function item(href, label) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const active = here.startsWith(href.toLowerCase());
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  }
  function themeLabel() { return theme.get()==='dark' ? 'Oscuro' : 'Claro'; }

  window.renderMenu = function (containerId = 'appMenu') {
    const base = BASE_APP + '/public/pages';
    const html = `
      <div class="menu">
        ${item(base + '/home/', 'Home')}
        ${item(base + '/curso-dashboard/', 'Dashboard')}
        ${item(base + '/estudiantes/', 'Estudiantes')}
        ${item(base + '/grupos/', 'Grupos')}
        ${item(base + '/entregas/', 'Entregas')}
        ${item(base + '/asistencia/', 'Asistencia')}
        ${item(base + '/reportes/', 'Reportes')}
        <div class="spacer"></div>
        <button id="themeBtn" class="btn btn-ghost round" title="Cambiar tema">🌓 <span id="themeText">${themeLabel()}</span></button>
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = BASE_APP + '/public/pages/home/';
    });
    document.getElementById('themeBtn')?.addEventListener('click', () => {
      theme.toggle();
      const t = document.getElementById('themeText'); if (t) t.textContent = themeLabel();
    });
  };
})();
