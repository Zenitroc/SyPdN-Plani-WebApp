// public/assets/js/theme.js
window.theme = (function(){
  const KEY = 'spn_theme';
  const THEMES = ['light','dark','aesthetic','minimal','pinkgirly','teammate','pollitos'];



  // Cargamos solo las fuentes de Google (las locales no van acá)
  const FONT_URL_ALL = 'https://fonts.googleapis.com/css2'
    + '?family=Inter:wght@400;600;800'
    + '&family=The+Girl+Next+Door'
    + '&family=Sansita:wght@400;700'
    + '&family=Poppins:wght@400;600;700'        // <— ejemplo agregado
    + '&family=Merriweather:wght@400;700'       // <— ejemplo agregado
    + '&family=Crafty+Girls'
    + '&family=Indie+Flower'
    + '&family=Montserrat:ital,wght@0,100..900;1,100..900'
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
    return localStorage.getItem(KEY)
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function set(t){ apply(t); }
  function next(){ const i = THEMES.indexOf(get()); set(THEMES[(i+1)%THEMES.length]); }

  document.addEventListener('DOMContentLoaded', ()=> apply(get()));
  return { get, set, next, all: THEMES };
})();
