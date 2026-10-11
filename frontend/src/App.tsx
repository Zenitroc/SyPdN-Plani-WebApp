import { type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EmptyState, ErrorState, TableSkeleton } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CourseProvider, useCourse } from './context/CourseContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './layouts/AppLayout';
import { COURSES_PATH, HOME_PATH, NAV_ITEMS, PROFILE_PATH, type NavItem } from './lib/nav';
import LoginPage from './pages/LoginPage';
import { PAGES } from './pages/registry';

function Splash() {
  return (
    <div className="splash" role="status">
      <img src="/assets/img/tutorial/PollitoGuia1.png" alt="" />
      <p>Cargando PolliWeb…</p>
    </div>
  );
}

/** Exige sesión; con contraseña vencida solo deja entrar al perfil para cambiarla. */
function Protected() {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.must_change_password && location.pathname !== PROFILE_PATH) return <Navigate to={PROFILE_PATH} replace />;
  return <CourseProvider><AppLayout /></CourseProvider>;
}

/** Las pantallas de curso esperan a que haya uno seleccionado. */
function CourseGate({ children }: { children: ReactNode }) {
  const { course, loading, error, reload } = useCourse();
  const { can } = useAuth();
  if (course) return <>{children}</>;
  if (loading) return <TableSkeleton rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <EmptyState mascot title="Todavía no hay un curso para mostrar"
      description={can('admin') ? 'Creá el primer curso para empezar a trabajar.' : 'Pedile al Gurú que te asigne a tu comisión.'}
      action={can('admin') ? <Link className="btn btn-primary" to="/app/admin/courses">Crear un curso</Link> : <Link className="btn btn-secondary" to={COURSES_PATH}>Ver mis cursos</Link>} />
  );
}

function Screen({ item }: { item: NavItem }) {
  const { can } = useAuth();
  const { courseId } = useCourse();
  const Page = PAGES[item.key];
  if (item.capability && !can(item.capability)) {
    return <EmptyState icon="lock" title="No tenés acceso a esta pantalla" description="Tu rol no incluye este módulo. Si lo necesitás, pedíselo al Gurú."
      action={<Link className="btn btn-secondary" to={HOME_PATH}>Volver al inicio</Link>} />;
  }
  // La clave por curso descarta el estado local (filtros, selección) al cambiar de curso.
  return item.needsCourse ? <CourseGate><Page key={courseId} /></CourseGate> : <Page />;
}

/** Con sesión activa, el login devuelve a la pantalla que se había pedido. */
function LoginRoute() {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Splash />;
  return user ? <Navigate to={(location.state as { from?: string } | null)?.from || HOME_PATH} replace /> : <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<Protected />}>
        {NAV_ITEMS.map(item => <Route key={item.key} path={item.path} element={<Screen item={item} />} />)}
      </Route>
      <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <FeedbackProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </FeedbackProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
