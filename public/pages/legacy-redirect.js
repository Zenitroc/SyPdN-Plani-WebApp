(function () {
  const path = location.pathname;
  const match = path.match(/\/(?:public\/)?pages\/([^\/]+)\/?/);
  if (!match) return;

  const aliases = {
    alumnos: 'alumnos-global',
  };
  const slug = aliases[match[1]] || match[1];

  const base = path.includes('/public/')
    ? path.slice(0, path.indexOf('/public/'))
    : path.includes('/pages/')
      ? path.slice(0, path.indexOf('/pages/'))
      : '';

  const spaBase = path.includes('/public/') ? `${base}/public/spa/` : `${base}/spa/`;
  const search = location.search || '';
  location.replace(`${spaBase}#/${slug}${search}`);
})();