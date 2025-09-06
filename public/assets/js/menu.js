(function () {
  function item(href, label) {
    const here = location.pathname.replace(/\/index\.html?$/,'/').toLowerCase();
    const active = here.startsWith(href.toLowerCase());
    return `<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  }
  window.renderMenu = function (containerId = 'appMenu') {
    const base = BASE_APP + '/public/pages';
    const html = `
      <style>
        .menu{display:flex;gap:.75rem;align-items:center;padding:.5rem;border-bottom:1px solid #ddd}
        .menu a{padding:.35rem .6rem;text-decoration:none;border-radius:.5rem;color:#222}
        .menu a.active{background:#eef}
        .menu button{margin-left:auto;padding:.35rem .6rem;border:1px solid #ccc;border-radius:.5rem;background:#fafafa;cursor:pointer}
      </style>
      <div class="menu">
        ${item(base + '/home/', 'Home')}
        ${item(base + '/curso-dashboard/', 'Dashboard')}
        ${item(base + '/estudiantes/', 'Estudiantes')}
        ${item(base + '/entregas/', 'Entregas')}
        ${item(base + '/asistencia/', 'Asistencia')}
        ${item(base + '/reportes/', 'Reportes')}
        <button id="logoutBtn">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.onclick = () => { api.clearToken(); courseContext.clear(); location.href = BASE_APP + '/public/pages/home/'; };
  };
})();
