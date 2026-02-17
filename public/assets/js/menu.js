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

  function createTutorialManager() {
    if (window.tutorialManager) return window.tutorialManager;

    let cfg = null;
    let roles = [];
    let me = null;
    let currentMode = null;
    let currentSteps = [];
    let currentIndex = 0;
    let highlightedEl = null;

    const PENDING_KEY = 'spdn_tutorial_pending';

    function routeForKey(routeKey) {
      if (!routeKey) return null;
      return window.getPageRoute ? window.getPageRoute(routeKey) : null;
    }

    function getCurrentPageKey() {
      const pages = window.APP_ROUTES?.pages || {};
      const here = location.pathname.replace(/\/index\.html?$/i, '/').toLowerCase();
      for (const [key, rawPath] of Object.entries(pages)) {
        const normalized = (rawPath || '').replace(/\/index\.html?$/i, '/').toLowerCase();
        if (normalized && here.startsWith(normalized)) return key;
      }
      return null;
    }

    async function loadConfig() {
      if (cfg) return cfg;
      const baseAssets = window.APP_ROUTES?.assetsBase || '/assets';
      const res = await fetch(`${baseAssets}/data/tutorial-config.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar configuración de tutorial');
      cfg = await res.json();
      return cfg;
    }

    function canSeeStep(step) {
      const allowed = Array.isArray(step.rolesAny) ? step.rolesAny : [];
      if (!allowed.length) return true;
      return allowed.some(r => roles.includes(r));
    }

    function mascotForStep(step) {
      const mascots = cfg?.mascots || [];
      const mascotId = step.mascotId || cfg?.defaultMascotId;
      return mascots.find(m => m.id === mascotId) || mascots[0] || null;
    }

    function removeHighlight() {
      if (highlightedEl) {
        highlightedEl.classList.remove('tutorial-highlight-target');
        highlightedEl = null;
      }
    }

    function applyHighlight(selector) {
      removeHighlight();
      if (!selector) return;
      const el = document.querySelector(selector);
      if (!el) return;
      highlightedEl = el;
      el.classList.add('tutorial-highlight-target');
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }

    function ensureOverlay() {
      let overlay = document.getElementById('tutorialOverlay');
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'tutorialOverlay';
      overlay.className = 'tutorial-overlay';
      overlay.innerHTML = `
        <div class="tutorial-panel" role="dialog" aria-modal="true" aria-label="Tutorial guiado">
          <button class="tutorial-close" type="button" data-tutorial-close aria-label="Cerrar tutorial">✕</button>
          <div class="tutorial-mascot-wrap">
            <img class="tutorial-mascot" data-tutorial-mascot alt="Mascota del tutorial" />
          </div>
          <div class="tutorial-content">
            <div class="tutorial-progress" data-tutorial-progress></div>
            <h3 class="tutorial-title" data-tutorial-title></h3>
            <p class="tutorial-text" data-tutorial-text></p>
          </div>
          <div class="tutorial-actions">
            <button type="button" class="btn btn-ghost" data-tutorial-prev>Anterior</button>
            <button type="button" class="btn btn-primary" data-tutorial-next>Siguiente</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('[data-tutorial-close]')?.addEventListener('click', close);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
      });
      overlay.querySelector('[data-tutorial-prev]')?.addEventListener('click', prev);
      overlay.querySelector('[data-tutorial-next]')?.addEventListener('click', next);
      return overlay;
    }

    function renderStep() {
      const overlay = ensureOverlay();
      const step = currentSteps[currentIndex];
      if (!step) {
        close();
        return;
      }

      const mascot = mascotForStep(step);
      const progress = overlay.querySelector('[data-tutorial-progress]');
      const title = overlay.querySelector('[data-tutorial-title]');
      const text = overlay.querySelector('[data-tutorial-text]');
      const mascotImg = overlay.querySelector('[data-tutorial-mascot]');
      const prevBtn = overlay.querySelector('[data-tutorial-prev]');
      const nextBtn = overlay.querySelector('[data-tutorial-next]');

      progress.textContent = `Paso ${currentIndex + 1} de ${currentSteps.length}`;
      title.textContent = step.title || 'Tutorial';
      text.textContent = step.text || '';
      if (mascotImg) {
        mascotImg.src = mascot?.image || '';
        mascotImg.alt = mascot?.name ? `Mascota ${mascot.name}` : 'Mascota del tutorial';
      }
      prevBtn.disabled = currentIndex === 0;
      nextBtn.textContent = currentIndex === currentSteps.length - 1 ? 'Finalizar' : 'Siguiente';

      applyHighlight(step.selector);
      overlay.classList.add('is-visible');
    }

    function close() {
      currentMode = null;
      currentSteps = [];
      currentIndex = 0;
      removeHighlight();
      localStorage.removeItem(PENDING_KEY);
      const overlay = document.getElementById('tutorialOverlay');
      if (overlay) overlay.classList.remove('is-visible');
    }

    function prev() {
      if (currentIndex <= 0) return;
      currentIndex -= 1;
      renderStep();
    }

    function next() {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= currentSteps.length) {
        close();
        return;
      }

      const nextStep = currentSteps[nextIndex];
      if (currentMode === 'journey' && nextStep?.routeKey) {
        const targetRoute = routeForKey(nextStep.routeKey);
        const here = location.pathname.replace(/\/index\.html?$/i, '/').toLowerCase();
        const normalizedTarget = (targetRoute || '').replace(/\/index\.html?$/i, '/').toLowerCase();
        if (normalizedTarget && normalizedTarget !== here) {
          localStorage.setItem(PENDING_KEY, JSON.stringify({
            journeyId: 'onboarding',
            index: nextIndex
          }));
          location.href = targetRoute;
          return;
        }
      }

      currentIndex = nextIndex;
      renderStep();
    }

    async function startPageTutorial() {
      await loadConfig();
      const pageKey = getCurrentPageKey();
      if (!pageKey) return;
      const pageSteps = (cfg?.pageTutorials?.[pageKey] || []).filter(canSeeStep);
      if (!pageSteps.length) {
        alert('No hay pasos de tutorial para esta pantalla y tu rol.');
        return;
      }
      currentMode = 'page';
      currentSteps = pageSteps;
      currentIndex = 0;
      renderStep();
    }

    async function startJourney(journeyId = 'onboarding', startIndex = 0) {
      await loadConfig();
      const journey = (cfg?.journeys?.[journeyId] || []).filter(canSeeStep);
      if (!journey.length) {
        alert('No hay recorrido global disponible para tu rol.');
        return;
      }
      currentMode = 'journey';
      currentSteps = journey;
      currentIndex = Math.max(0, Math.min(startIndex, journey.length - 1));

      const step = currentSteps[currentIndex];
      if (step?.routeKey) {
        const targetRoute = routeForKey(step.routeKey);
        const here = location.pathname.replace(/\/index\.html?$/i, '/').toLowerCase();
        const normalizedTarget = (targetRoute || '').replace(/\/index\.html?$/i, '/').toLowerCase();
        if (normalizedTarget && normalizedTarget !== here) {
          localStorage.setItem(PENDING_KEY, JSON.stringify({ journeyId, index: currentIndex }));
          location.href = targetRoute;
          return;
        }
      }

      renderStep();
    }

    async function resumePendingIfAny() {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      try {
        const pending = JSON.parse(raw);
        if (!pending?.journeyId && pending?.journeyId !== 'onboarding') {
          localStorage.removeItem(PENDING_KEY);
          return;
        }
        await startJourney(pending.journeyId || 'onboarding', Number(pending.index || 0));
      } catch (_) {
        localStorage.removeItem(PENDING_KEY);
      }
    }

    async function init(user) {
      me = user || null;
      roles = Array.isArray(me?.roles) ? me.roles : [];
      await loadConfig();
      await resumePendingIfAny();
    }

    const manager = {
      init,
      startPageTutorial,
      startJourney
    };

    window.tutorialManager = manager;
    window.startTutorialJourney = (journeyId) => manager.startJourney(journeyId || 'onboarding');
    return manager;
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
        <button id="menuTutorialBtn" class="btn btn-tonal round">🐥 Tutorial</button>
        <button class="btn btn-ghost round" onclick="theme.toggle()">🌓 Modo</button>
        ${profile}
        <button id="logoutBtn" class="btn btn-neutral">Salir</button>
      </div>`;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      api.clearToken(); courseContext.clear(); location.href = page('home');
    });

    const groups = Array.from(document.querySelectorAll('.menu-group'));
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

    const tutorialManager = createTutorialManager();
    tutorialManager.init(me).catch(err => console.warn('Tutorial init error', err));
    document.getElementById('menuTutorialBtn')?.addEventListener('click', () => {
      tutorialManager.startPageTutorial().catch(err => {
        console.warn('Tutorial page error', err);
        alert('No se pudo iniciar el tutorial.');
      });
    });
  };
})();