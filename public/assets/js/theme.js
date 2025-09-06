(function () {
  const KEY = 'spn_theme'; // 'light' | 'dark'
  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  function get() {
    return localStorage.getItem(KEY) || (systemPrefersDark() ? 'dark' : 'light');
  }
  function set(theme) {
    localStorage.setItem(KEY, theme);
    apply(theme);
  }
  function toggle() { set(get()==='dark' ? 'light' : 'dark'); }

  // Cambiar colores en caliente: theme.setColors({ primary:'#ff6b00', brand:'#...'})
  function setColors(map) {
    Object.entries(map || {}).forEach(([k,v]) => {
      document.documentElement.style.setProperty(`--${k}`, v);
    });
  }

  // Inicializar
  apply(get());
  window.theme = { get, set, toggle, setColors };
})();
