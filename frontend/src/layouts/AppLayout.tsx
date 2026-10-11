import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '../components/CommandPalette';
import { CourseSwitcher } from '../components/CourseSwitcher';
import { Icon } from '../components/Icon';
import { Tutorial } from '../components/Tutorial';
import { Avatar, IconButton, Menu, MenuItem, TableSkeleton, cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fullName } from '../lib/format';
import { HOME_PATH, NAV, PROFILE_PATH, navItemByPath } from '../lib/nav';

const COLLAPSED_KEY = 'spn_sidebar_collapsed';
const APP_NAME = 'PolliWeb';
const isMac = /mac/i.test(navigator.platform);

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark"><img src="/assets/img/tutorial/PollitoGuia1.png" alt="" /></span>
      {!compact && <b>Polli<span>Web</span></b>}
    </span>
  );
}

export function AppLayout() {
  const { user, logout, can } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const current = navItemByPath(location.pathname);
  const section = NAV.find(group => group.items.some(item => item.key === current?.key));
  const sections = NAV
    .map(group => ({ ...group, items: group.items.filter(item => !item.hidden && (!item.capability || can(item.capability))) }))
    .filter(group => group.items.length);

  useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
    setTutorialOpen(false);
    document.title = current ? `${current.label} · ${APP_NAME}` : APP_NAME;
  }, [location.pathname, current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(value => !value); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const displayName = fullName(user) || user?.username || 'Usuario';
  const roleLabel = user?.roles.join(' · ') || 'Sin rol';
  const themeLabel = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  const userMenu = (close: () => void) => (
    <>
      <div className="menu-header"><strong>{displayName}</strong><small>{roleLabel}</small></div>
      <MenuItem icon="user" onClick={() => { close(); navigate(PROFILE_PATH); }}>Mi perfil</MenuItem>
      <hr />
      <MenuItem icon="logout" tone="danger" onClick={() => { close(); logout(); }}>Cerrar sesión</MenuItem>
    </>
  );

  return (
    <div className={cx('shell', collapsed && 'is-collapsed', drawerOpen && 'is-drawer-open')}>
      <aside className="sidebar" aria-label="Navegación principal">
        <Link to={HOME_PATH} className="sidebar-brand" aria-label={`${APP_NAME}, ir al inicio`}><Brand compact={collapsed} /></Link>
        <CourseSwitcher compact={collapsed} />
        <nav className="nav">
          {sections.map(group => (
            <div key={group.label} className="nav-section">
              <p className="nav-label">{group.label}</p>
              {group.items.map(item => (
                <NavLink key={item.key} to={item.path} className="nav-link" title={collapsed ? item.label : undefined}>
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-foot-row">
            <button type="button" className="nav-link sidebar-theme" onClick={toggleTheme} title={collapsed ? themeLabel : undefined}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
              <span>{themeLabel}</span>
            </button>
            <IconButton icon={collapsed ? 'chevron-right' : 'chevron-left'} size={16} label={collapsed ? 'Expandir menú' : 'Contraer menú'} className="sidebar-collapse" onClick={() => setCollapsed(value => !value)} />
          </div>
          {/* En escritorio el perfil vive acá; en teléfono pasa a la barra superior. */}
          <div className="sidebar-user-slot">
            <Menu align="start" side="top" trigger={props => (
              <button type="button" className="sidebar-user" {...props} aria-haspopup="menu" title={collapsed ? displayName : undefined}>
                <Avatar name={displayName} src={user?.photo_url} size={34} />
                <span className="sidebar-user-text"><strong>{displayName}</strong><small>{roleLabel}</small></span>
                <Icon name="chevron-down" size={15} className="flip" />
              </button>
            )}>{userMenu}</Menu>
          </div>
        </div>
      </aside>
      <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <IconButton icon="menu" label="Abrir menú" className="topbar-menu" onClick={() => setDrawerOpen(true)} />
          <div className="crumbs">
            {section && <span>{section.label}</span>}
            {section && <Icon name="chevron-right" size={14} />}
            <strong>{current?.label ?? APP_NAME}</strong>
          </div>
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} />
            <span>Buscar pantallas, cursos o estudiantes…</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <div className="topbar-actions">
            {current && <button type="button" className="guide-btn" onClick={() => setTutorialOpen(value => !value)} aria-pressed={tutorialOpen}><Icon name="help" size={16} /><span>Guía</span></button>}
            <div className="topbar-user">
              <Menu trigger={props => (
                <button type="button" className="user-chip" {...props} aria-haspopup="menu" aria-label={`Cuenta de ${displayName}`}>
                  <Avatar name={displayName} src={user?.photo_url} size={34} />
                </button>
              )}>{userMenu}</Menu>
            </div>
          </div>
        </header>

        <main className="content">
          {/* La clave por ruta reinicia la animación de entrada en cada navegación. */}
          <div className="page" key={location.pathname}>
            <Suspense fallback={<TableSkeleton rows={8} />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {tutorialOpen && current && <Tutorial pageKey={current.key} onClose={() => setTutorialOpen(false)} />}
    </div>
  );
}
