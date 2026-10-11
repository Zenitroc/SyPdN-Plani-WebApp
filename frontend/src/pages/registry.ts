import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Componente de cada pantalla, por `key` de lib/nav.ts. Se cargan bajo demanda.
export const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  dashboard: lazy(() => import('./DashboardPage')),
  courses: lazy(() => import('./CoursesPage')),
  news: lazy(() => import('./NewsPage')),
  students: lazy(() => import('./StudentsPage')),
  groups: lazy(() => import('./GroupsPage')),
  planning: lazy(() => import('./PlanningPage')),
  assignments: lazy(() => import('./AssignmentsPage')),
  partials: lazy(() => import('./PartialsPage')),
  attendance: lazy(() => import('./AttendancePage')),
  finals: lazy(() => import('./FinalsPage')),
  'admin-courses': lazy(() => import('./admin/CoursesAdminPage')),
  'admin-users': lazy(() => import('./admin/UsersAdminPage')),
  'admin-students': lazy(() => import('./admin/GlobalStudentsPage')),
  profile: lazy(() => import('./ProfilePage')),
};
