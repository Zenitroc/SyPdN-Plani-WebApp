import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useTheme } from '../context/ThemeContext';
import { matches } from '../lib/format';
import { NAV_ITEMS } from '../lib/nav';
import { useApi } from '../lib/query';
import { Icon } from './Icon';

type Command = { id: string; group: string; label: string; hint?: string; icon: string; run: () => void };
const MAX_STUDENTS = 8;

/** Buscador global (Ctrl/⌘ + K): pantallas, cursos, estudiantes del curso y acciones rápidas. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { can, logout } = useAuth();
  const { courses, course, selectCourse } = useCourse();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const students = useApi<any[]>(course ? `/estudiantes?course_id=${course.id}` : null);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path);
    const pages = NAV_ITEMS
      .filter(item => !item.capability || can(item.capability))
      .map(item => ({ id: `page-${item.key}`, group: 'Ir a', label: item.label, hint: item.description, icon: item.icon, run: go(item.path) }));
    const courseCommands = courses
      .filter(item => item.id !== course?.id)
      .map(item => ({ id: `course-${item.id}`, group: 'Cambiar de curso', label: item.name, hint: [item.code, item.term].filter(Boolean).join(' · '), icon: 'book', run: () => selectCourse(item.id) }));
    const studentCommands = query.trim().length < 2 ? [] : (students.data ?? [])
      .filter(student => matches(query, `${student.apellido} ${student.nombre}`, student.legajo, student.email_inst))
      .slice(0, MAX_STUDENTS)
      .map(student => ({
        id: `student-${student.id}`, group: `Estudiantes de ${course?.name ?? 'curso'}`, label: `${student.apellido}, ${student.nombre}`,
        hint: [student.legajo && `Legajo ${student.legajo}`, student.group_no ? `Grupo ${student.group_no}` : 'Sin grupo'].filter(Boolean).join(' · '),
        icon: 'user', run: go(`/app/students?q=${encodeURIComponent(student.apellido)}`),
      }));
    const actions: Command[] = [
      { id: 'theme', group: 'Acciones', label: theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro', icon: theme === 'dark' ? 'sun' : 'moon', run: toggleTheme },
      { id: 'logout', group: 'Acciones', label: 'Cerrar sesión', icon: 'logout', run: logout },
    ];
    return [...studentCommands, ...[...pages, ...courseCommands, ...actions].filter(command => matches(query, command.label, command.hint))];
  }, [query, students.data, courses, course, can, navigate, selectCourse, theme, toggleTheme, logout]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => { list.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }); }, [index]);

  const execute = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(value => Math.min(commands.length - 1, value + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); execute(commands[index]); }
    else if (event.key === 'Escape') onClose();
  };

  let lastGroup = '';
  return createPortal(
    <div className="palette-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Buscador">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown}
            placeholder="Buscar pantallas, cursos o estudiantes…" aria-label="Buscar" />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={list}>
          {commands.map((command, position) => {
            const header = command.group !== lastGroup ? <p className="palette-group">{command.group}</p> : null;
            lastGroup = command.group;
            return (
              <div key={command.id}>
                {header}
                <button type="button" className={`palette-item${position === index ? ' is-active' : ''}`} onMouseEnter={() => setIndex(position)} onClick={() => execute(command)}>
                  <span className="palette-icon"><Icon name={command.icon} size={16} /></span>
                  <span className="palette-text"><strong>{command.label}</strong>{command.hint && <small>{command.hint}</small>}</span>
                  {position === index && <Icon name="arrow-right" size={15} />}
                </button>
              </div>
            );
          })}
          {!commands.length && <p className="palette-empty">Sin resultados para “{query}”.</p>}
        </div>
        <footer className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span></footer>
      </div>
    </div>,
    document.body,
  );
}
