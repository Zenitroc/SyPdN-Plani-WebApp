import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useApi } from '../lib/query';
import { seesAllCourses } from '../lib/permissions';

export type Course = { id: number; code: string; name: string; term: string; is_active: boolean; color: string };

type CourseValue = {
  courses: Course[];
  course: Course | null;
  courseId: number | null;
  selectCourse: (id: number) => void;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

const CourseContext = createContext<CourseValue | null>(null);
const STORAGE_KEY = 'spn_selected_course_id';

export function CourseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const scope = seesAllCourses(user?.roles) ? 'all' : 'mine';
  const list = useApi<Omit<Course, 'color'>[]>(user ? `/courses?scope=${scope}` : null, { staleMs: 60_000 });
  const colors = useApi<{ colors: { course_id: number; color_hex: string }[] }>(user ? `/courses/colors?scope=${scope}` : null, { staleMs: 60_000 });
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(localStorage.getItem(STORAGE_KEY)) || null);

  const courses = useMemo<Course[]>(() => {
    const colorById = new Map((colors.data?.colors ?? []).map(row => [Number(row.course_id), row.color_hex]));
    return (list.data ?? []).map(course => ({ ...course, id: Number(course.id), is_active: Boolean(course.is_active), color: colorById.get(Number(course.id)) || '' }));
  }, [list.data, colors.data]);

  // Si el curso guardado ya no está disponible, se toma el primero activo.
  const course = useMemo(
    () => courses.find(item => item.id === selectedId) ?? courses.find(item => item.is_active) ?? courses[0] ?? null,
    [courses, selectedId],
  );

  useEffect(() => {
    if (course) localStorage.setItem(STORAGE_KEY, String(course.id));
  }, [course]);

  const selectCourse = useCallback((id: number) => setSelectedId(id), []);
  const reload = useCallback(() => { void list.reload(); void colors.reload(); }, [list.reload, colors.reload]);

  const value = useMemo(
    () => ({ courses, course, courseId: course?.id ?? null, selectCourse, loading: list.loading, error: list.error, reload }),
    [courses, course, selectCourse, list.loading, list.error, reload],
  );
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse(): CourseValue {
  const value = useContext(CourseContext);
  if (!value) throw new Error('useCourse debe usarse dentro de <CourseProvider>');
  return value;
}
