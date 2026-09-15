import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(() => localStorage.getItem('spn_selected_course_id') || '');
  const [loading, setLoading] = useState(Boolean(session.token));
  const [courseError, setCourseError] = useState('');

  const refresh = async () => {
    if (!session.token) { setLoading(false); return; }
    setLoading(true);
    setCourseError('');
    try {
      const nextUser = await api.me();
      const scope = nextUser.roles?.includes('GURU') ? 'all' : 'mine';
      const [rawCourses, colorRows] = await Promise.all([api.courses(scope), api.courseColors(scope).catch(() => [])]);
      const colors = new Map(colorRows.map(row => [String(row.course_id), row.color_hex]));
      const nextCourses = rawCourses.map(course => ({ ...course, color: colors.get(String(course.id)) || '' }));
      setUser(nextUser); setCourses(nextCourses);
      setCourseId(current => nextCourses.some(course => String(course.id) === String(current)) ? current : String(nextCourses[0]?.id || ''));
    } catch (error) {
      if (error.status === 401 || error.status === 403) session.clear();
      setCourseError(error.message || 'No se pudieron cargar los cursos.');
      setUser(null); setCourses([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (courseId) localStorage.setItem('spn_selected_course_id', courseId); }, [courseId]);

  const currentCourse = courses.find(course => String(course.id) === String(courseId)) || null;
  const value = useMemo(() => ({ user, courses, availableCourses: courses, courseId, currentCourseId: courseId, currentCourse, currentCourseName: currentCourse?.name || '', currentCourseColor: currentCourse?.color || '', setCourseId, selectCourse: setCourseId, loading, courseError, refresh, logout: () => { session.clear(); setUser(null); setCourses([]); } }), [user, courses, courseId, currentCourse, loading, courseError]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
