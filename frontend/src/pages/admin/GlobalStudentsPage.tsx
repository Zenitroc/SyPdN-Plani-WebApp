import { useState } from 'react';
import { CourseDot } from '../../components/CourseSwitcher';
import { Async, Badge, Button, Card, EmptyState, PageHeader, SearchInput, Segmented } from '../../components/ui';
import { useCourse } from '../../context/CourseContext';
import { api } from '../../lib/api';
import { downloadCsv, matches, plural } from '../../lib/format';
import { useQuery } from '../../lib/query';
import type { Student } from '../StudentsPage';

type Row = Student & { course_id: number; course_name: string; course_color: string };

export default function GlobalStudentsPage() {
  const { courses } = useCourse();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const ids = courses.map(course => course.id).join(',');

  // No hay un endpoint consolidado: se pide el padrón de cada curso y se unen acá.
  const query = useQuery<Row[]>(courses.length ? `global-students:${ids}` : null, async () => {
    const lists = await Promise.all(courses.map(course => api.get<Student[]>(`/estudiantes?course_id=${course.id}`)
      .then(rows => rows.map(row => ({ ...row, course_id: course.id, course_name: course.name, course_color: course.color })))));
    return lists.flat().sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'));
  });

  return (
    <>
      <PageHeader eyebrow="Administración" title="Todos los estudiantes" description="Padrón consolidado de todos los cursos, para ubicar a alguien sin importar su comisión."
        actions={query.data && <Button variant="secondary" icon="download" onClick={() => downloadCsv('estudiantes-todos-los-cursos', ['Apellido', 'Nombre', 'Legajo', 'Email', 'Curso', 'ID en el curso', 'Grupo', 'Estado'],
          query.data!.map(row => [row.apellido, row.nombre, row.legajo, row.email_inst, row.course_name, row.course_id_seq, row.group_no, row.status]))}>Exportar a Excel (CSV)</Button>} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por apellido, legajo, email o curso…" />
        <Segmented label="Estado" value={status} onChange={setStatus} options={[{ value: 'ALL', label: 'Todos' }, { value: 'ALTA', label: 'Alta' }, { value: 'BAJA', label: 'Baja' }]} />
        {query.data && <span className="toolbar-count">{plural(query.data.length, 'inscripción', 'inscripciones')} en {plural(courses.length, 'curso', 'cursos')}</span>}
      </div>

      <Card className="card-flush">
        {!courses.length ? <EmptyState mascot title="No hay cursos cargados" /> : (
          <Async query={query}>
            {data => {
              const rows = data.filter(row => (status === 'ALL' || row.status === status) && matches(search, `${row.apellido} ${row.nombre}`, row.legajo, row.email_inst, row.course_name));
              return rows.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Estudiante</th><th>Legajo</th><th>Curso</th><th className="center">ID</th><th>Grupo</th><th>Estado</th></tr></thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={`${row.course_id}-${row.id}`} className={row.status === 'BAJA' ? 'is-muted' : ''}>
                          <td><span className="cell-main">{row.apellido}, {row.nombre}</span><span className="cell-sub">{row.email_inst || 'Sin email'}</span></td>
                          <td className="num">{row.legajo || '—'}</td>
                          <td><span className="course-cell"><CourseDot color={row.course_color} size={10} />{row.course_name}</span></td>
                          <td className="center num">{row.course_id_seq}</td>
                          <td>{row.group_no ? `Grupo ${row.group_no}` : <span className="muted">Sin grupo</span>}</td>
                          <td><Badge tone={row.status === 'ALTA' ? 'success' : 'neutral'}>{row.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState icon="search" title={data.length ? 'Ningún estudiante coincide' : 'Todavía no hay estudiantes cargados'} />;
            }}
          </Async>
        )}
      </Card>
    </>
  );
}
