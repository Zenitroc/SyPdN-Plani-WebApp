import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseMeta } from '../components/CourseSwitcher';
import { Icon } from '../components/Icon';
import { Badge, Button, EmptyState, ErrorState, PageHeader, SearchInput, Skeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCourse, type Course } from '../context/CourseContext';
import { useFeedback } from '../context/FeedbackContext';
import { api } from '../lib/api';
import { fullName, matches, plural } from '../lib/format';
import { HOME_PATH } from '../lib/nav';
import { invalidate } from '../lib/query';

const DEFAULT_COLOR = '#f26a1b';
const COLOR_SAVE_DELAY_MS = 600;

export default function CoursesPage() {
  const { user, can } = useAuth();
  const { courses, course: current, selectCourse, loading, error, reload } = useCourse();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const visible = courses.filter(item => matches(query, item.name, item.code, item.term));

  const open = (item: Course) => {
    selectCourse(item.id);
    navigate(HOME_PATH);
  };

  // El selector nativo emite un cambio por cada movimiento: se guarda cuando el usuario deja de arrastrar.
  const colorTimer = useRef(0);
  const saveColor = (item: Course, color: string) => {
    clearTimeout(colorTimer.current);
    colorTimer.current = window.setTimeout(async () => {
      try {
        await api.post('/course-color/guardar', { course_id: item.id, color_hex: color.toUpperCase() });
        invalidate('/courses/colors');
      } catch (reason) { toast.error(reason); }
    }, COLOR_SAVE_DELAY_MS);
  };

  return (
    <>
      <PageHeader eyebrow="Inicio" title={`Hola, ${user?.name || fullName(user) || 'docente'}`}
        description="Elegí el curso con el que querés trabajar. Queda seleccionado para todas las pantallas."
        actions={can('admin') && <Link className="btn btn-secondary" to="/app/admin/courses"><Icon name="settings" size={16} /><span>Administrar cursos</span></Link>} />

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, código o comisión…" />
        <span className="toolbar-count">{plural(visible.length, 'curso', 'cursos')}</span>
      </div>

      {error && !courses.length ? <ErrorState error={error} onRetry={reload} /> : loading ? (
        <div className="course-grid">{[0, 1, 2].map(item => <div key={item} className="course-card"><Skeleton width="40%" /><Skeleton width="75%" height={20} /><Skeleton width="55%" /></div>)}</div>
      ) : !visible.length ? (
        <EmptyState mascot title={courses.length ? 'Ningún curso coincide con la búsqueda' : 'Todavía no tenés cursos asignados'}
          description={courses.length ? 'Probá con otro nombre o código.' : 'Pedile al Gurú que te asigne a tu comisión.'} />
      ) : (
        <div className="course-grid">
          {visible.map((item, index) => {
            const selected = item.id === current?.id;
            return (
              <article key={item.id} className={`course-card${selected ? ' is-current' : ''}`} style={{ '--course': item.color || DEFAULT_COLOR, animationDelay: `${Math.min(index, 8) * 50}ms` } as React.CSSProperties}>
                <header>
                  <span className="course-card-mark">{item.name.slice(0, 1).toUpperCase()}</span>
                  <div className="course-card-badges">
                    {selected && <Badge tone="brand" icon="check">Actual</Badge>}
                    {!item.is_active && <Badge tone="warning">Inactivo</Badge>}
                  </div>
                </header>
                <div>
                  <h3>{item.name}</h3>
                  <p className="muted">{courseMeta(item) || 'Sin código'}</p>
                </div>
                <footer>
                  {can('courses.color') && (
                    <label className="color-input" title="Color del curso">
                      <Icon name="palette" size={15} />
                      {/* La clave reinicia el selector cuando llega o cambia el color guardado. */}
                      <input type="color" key={item.color} defaultValue={item.color || DEFAULT_COLOR} aria-label={`Color de ${item.name}`}
                        onChange={event => saveColor(item, event.target.value)} />
                    </label>
                  )}
                  <Button variant={selected ? 'soft' : 'primary'} size="sm" icon="arrow-right" onClick={() => open(item)}>{selected ? 'Abrir' : 'Seleccionar'}</Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
