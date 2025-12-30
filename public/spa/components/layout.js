export function renderLayout() {
  return `
    <div class="spa-shell">
      <aside class="spa-side">
        <div class="spa-brand">
          <div class="spa-logo">SP</div>
          <div>
            <strong>SyPdN</strong>
            <small>Planificación</small>
          </div>
        </div>
        <nav id="appMenu" class="spa-menu"></nav>
      </aside>
      <div class="spa-main">
        <header class="spa-topbar">
          <div>
            <div class="spa-title" id="pageTitle">Inicio</div>
            <div class="spa-subtitle" id="pageSubtitle">Plataforma académica</div>
          </div>
          <div class="spa-actions">
            <button class="btn btn-ghost round" id="themeToggle" type="button">🌓</button>
            <button class="btn btn-neutral" id="logoutTop" type="button">Salir</button>
          </div>
        </header>
        <div id="appView" class="spa-view" aria-live="polite"></div>
      </div>
    </div>
  `;
}