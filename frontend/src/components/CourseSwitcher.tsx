import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourse, type Course } from '../context/CourseContext';
import { matches } from '../lib/format';
import { COURSES_PATH } from '../lib/nav';
import { Icon } from './Icon';

const SEARCH_FROM = 6;

export const courseMeta = (course: Pick<Course, 'code' | 'term'>): string => [course.code, course.term].filter(Boolean).join(' · ');

export function CourseDot({ color, size = 12 }: { color: string; size?: number }) {
  return <i className="course-dot" style={{ width: size, height: size, background: color || 'var(--brand-500)' }} />;
}

/** Selector del curso de trabajo: está siempre a mano en la barra lateral. */
export function CourseSwitcher({ compact }: { compact?: boolean }) {
  const { courses, course, selectCourse, loading } = useCourse();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const visible = courses.filter(item => matches(query, item.name, item.code, item.term));

  return (
    <div className="course-switcher" ref={root}>
      <button type="button" className="course-trigger" onClick={() => { setOpen(value => !value); setQuery(''); }}
        aria-haspopup="listbox" aria-expanded={open} title={course ? `Curso: ${course.name}` : 'Elegir curso'}>
        <span className="course-mark" style={{ background: course?.color || 'var(--brand-500)' }}>{(course?.name || '?').slice(0, 1).toUpperCase()}</span>
        {!compact && (
          <span className="course-trigger-text">
            <small>Curso actual</small>
            <strong>{loading ? 'Cargando…' : course?.name || 'Sin cursos'}</strong>
          </span>
        )}
        {!compact && <Icon name="chevron-down" size={16} className="course-chevron" />}
      </button>
      {open && (
        <div className="course-menu" role="listbox" aria-label="Cursos disponibles">
          {courses.length >= SEARCH_FROM && (
            <input className="input course-search" autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar curso…" aria-label="Buscar curso" />
          )}
          <div className="course-options">
            {visible.map(item => (
              <button key={item.id} type="button" role="option" aria-selected={item.id === course?.id} className={item.id === course?.id ? 'is-selected' : ''}
                onClick={() => { selectCourse(item.id); setOpen(false); }}>
                <CourseDot color={item.color} />
                <span><strong>{item.name}</strong><small>{courseMeta(item) || 'Sin código'}</small></span>
                {item.id === course?.id && <Icon name="check" size={16} />}
              </button>
            ))}
            {!visible.length && <p className="course-empty">{courses.length ? 'Ningún curso coincide.' : 'Todavía no tenés cursos asignados.'}</p>}
          </div>
          <Link className="course-all" to={COURSES_PATH} onClick={() => setOpen(false)}>Ver todos los cursos <Icon name="arrow-right" size={14} /></Link>
        </div>
      )}
    </div>
  );
}
