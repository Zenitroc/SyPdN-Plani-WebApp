// public/assets/js/theme.js
window.theme = (function(){
  const KEY = 'spn_theme';
  const THEMES = ['light','dark'];



  // Cargamos solo las fuentes de Google (las locales no van acá)
  const FONT_URL_ALL = 'https://fonts.googleapis.com/css2'
    + '?family=Inter:wght@400;600;800'
    + '&display=swap';

  function ensureFonts(){
    let link = document.getElementById('theme-fonts');
    if (!link) {
      link = document.createElement('link');
      link.id = 'theme-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = FONT_URL_ALL;
  }

  function apply(t){
    const theme = THEMES.includes(t) ? t : 'light';
    ensureFonts();                                // Google Fonts (Inter + TGND + Sansita)
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }

  function get(){
    const stored = localStorage.getItem(KEY);
    if (THEMES.includes(stored)) return stored;
    const fallback = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    localStorage.setItem(KEY, fallback);
    return fallback;
  }
  function set(t){ apply(t); }
  function next(){ const i = THEMES.indexOf(get()); set(THEMES[(i+1)%THEMES.length]); }
  function toggle(){ set(get() === 'dark' ? 'light' : 'dark'); }

  document.addEventListener('DOMContentLoaded', ()=> apply(get()));
  return { get, set, next, toggle, all: THEMES };
})();