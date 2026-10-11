// Prueba de humo de la API: recorre todos los endpoints dentro de un curso temporal
// y lo elimina al terminar. Requiere un usuario GURU.
//
//   SMOKE_USER=guru SMOKE_PASS=... node backend/tests/api-smoke.mjs
//   SMOKE_TOKEN=<jwt> API_URL=http://127.0.0.1:8080/api node backend/tests/api-smoke.mjs
//
// No se prueban POST /reportes (envía un correo real) ni POST /me/password.

const API = (process.env.API_URL || 'http://127.0.0.1:8080/api').replace(/\/$/, '');
const stamp = Date.now().toString(36);
const legajo = `S${stamp.slice(-6)}`; // people.legajo admite hasta 10 caracteres
let token = process.env.SMOKE_TOKEN || '';
let passed = 0;
const failures = [];

async function call(method, path, body, { auth = true, form } = {}) {
  const headers = {};
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
  const response = await fetch(API + path, { method, headers, body: form || (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* respuesta no JSON: se reporta abajo */ }
  return { status: response.status, json, text, data: json && typeof json === 'object' && 'data' in json ? json.data : json };
}

async function check(name, run) {
  try {
    await run();
    passed++;
    console.log(`  ok    ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FALLA ${name}\n        ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function ok(method, path, body, options) {
  const result = await call(method, path, body, options);
  expect(result.json !== null || result.status === 204, `${method} ${path} → ${result.status}, respuesta no JSON: ${result.text.slice(0, 200)}`);
  expect(result.status >= 200 && result.status < 300, `${method} ${path} → ${result.status} ${result.text.slice(0, 200)}`);
  return result.data;
}

async function fails(status, method, path, body, options) {
  const result = await call(method, path, body, options);
  expect(result.status === status, `${method} ${path} debía responder ${status} y respondió ${result.status} ${result.text.slice(0, 160)}`);
  expect(result.json && typeof result.json.error === 'string', `${method} ${path} debía devolver { error }`);
}

const state = { courseId: 0, userId: 0, enrollments: [], groups: [], assignmentId: 0 };

async function main() {
  console.log(`API: ${API}`);

  console.log('\nSesión');
  await check('ping público', async () => expect((await ok('GET', '/ping', undefined, { auth: false })).pong === true, 'pong ausente'));
  await check('rechaza pedidos sin token', () => fails(401, 'GET', '/me', undefined, { auth: false }));
  await check('rechaza credenciales inválidas', () => fails(401, 'POST', '/auth/login', { username: `nadie-${stamp}`, password: 'x' }, { auth: false }));
  if (!token) {
    await check('login', async () => {
      expect(process.env.SMOKE_USER && process.env.SMOKE_PASS, 'definí SMOKE_USER y SMOKE_PASS, o SMOKE_TOKEN');
      const data = await ok('POST', '/auth/login', { username: process.env.SMOKE_USER, password: process.env.SMOKE_PASS }, { auth: false });
      token = data.token;
      expect(token, 'el login no devolvió token');
    });
  }
  let me = null;
  await check('perfil propio', async () => {
    me = await ok('GET', '/me');
    expect(Array.isArray(me.roles) && me.roles.includes('GURU'), 'la prueba necesita un usuario GURU');
  });
  if (!me) return;
  await check('actualiza perfil propio (mismos valores)', () => ok('POST', '/me/update', { personal_email: me.personal_email, legajo: me.legajo, phone: me.phone }));

  console.log('\nCatálogo y cursos');
  await check('catálogo académico', async () => {
    const catalog = await ok('GET', '/catalog');
    expect(catalog.grades.scale.length > 0 && catalog.partials.length === 2 && catalog.attempts.length === 3, 'catálogo incompleto');
  });
  await check('lista de cursos (todos y propios)', async () => {
    expect(Array.isArray(await ok('GET', '/courses?scope=all')), 'scope=all no devolvió lista');
    expect(Array.isArray(await ok('GET', '/courses')), 'scope=mine no devolvió lista');
  });
  await check('colores de cursos (ruta literal, no /courses/{id})', async () => {
    expect(Array.isArray((await ok('GET', '/courses/colors?scope=all')).colors), 'colors ausente');
    expect(Array.isArray((await ok('GET', '/courses/colors')).colors), 'colors ausente (propios)');
  });

  console.log('\nAdministración de cursos');
  await check('crea curso temporal', async () => {
    const course = await ok('POST', '/admin/courses/create', { code: `SMOKE-${stamp}`, name: `Curso de prueba ${stamp}`, term: '2026', is_active: 1, plan_url: '' });
    state.courseId = course.id;
    expect(state.courseId > 0, 'sin id de curso');
  });
  if (!state.courseId) return;
  const cid = state.courseId;
  await check('detalle y listado admin', async () => {
    expect((await ok('GET', `/courses/${cid}`)).id === cid, 'detalle incorrecto');
    expect((await ok('GET', '/admin/courses')).some(course => Number(course.id) === cid), 'el curso no aparece en el listado');
  });
  await check('edita curso', () => ok('POST', '/admin/courses/update', { course_id: cid, name: `Curso de prueba ${stamp} (editado)`, is_active: 1 }));
  await check('color del curso', async () => {
    await ok('POST', '/course-color/guardar', { course_id: cid, color_hex: '#F26A1B' });
    expect((await ok('GET', `/course-color?course_id=${cid}`)).course.color_hex.toUpperCase() === '#F26A1B', 'el color no se guardó');
    await fails(422, 'POST', '/course-color/guardar', { course_id: cid, color_hex: 'naranja' });
  });
  await check('planificación', async () => {
    await ok('POST', '/planificacion/guardar', { course_id: cid, plan_url: 'https://example.com/plan' });
    expect((await ok('GET', `/planificacion?course_id=${cid}`)).course.plan_url === 'https://example.com/plan', 'plan_url no se guardó');
  });
  await check('selección de curso', async () => expect((await call('POST', '/session/course', { course_id: cid })).status === 204, 'debía responder 204'));

  console.log('\nAdministración de usuarios');
  await check('roles y usuarios', async () => {
    expect((await ok('GET', '/admin/roles')).length > 0, 'sin roles');
    expect((await ok('GET', '/admin/users')).length > 0, 'sin usuarios');
  });
  await check('crea usuario temporal', async () => {
    const created = await ok('POST', '/admin/users/create', { name: 'Smoke', last_name: 'Test', username: `smoke_${stamp}`, email: `smoke_${stamp}@example.invalid`, roles: ['AYUDANTE'] });
    state.userId = created.id;
    expect(state.userId > 0, 'sin id de usuario');
  });
  if (state.userId) {
    await check('rechaza usuario duplicado', () => fails(409, 'POST', '/admin/users/create', { name: 'Smoke', last_name: 'Test', username: `smoke_${stamp}`, email: `otro_${stamp}@example.invalid` }));
    await check('edita usuario y roles', async () => {
      await ok('POST', '/admin/users/update', { user_id: state.userId, phone: '123', roles: ['SENIOR'], reset_password: true });
      const detail = await ok('GET', `/admin/user-detail?user_id=${state.userId}`);
      expect(detail.user.roles.join() === 'SENIOR' && detail.user.must_change_password === 1, 'roles o reseteo no aplicados');
    });
    await check('la asignación a un curso rige sin volver a iniciar sesión', async () => {
      const username = `smoke_${stamp}`;
      const studentsPath = `/estudiantes?course_id=${cid}`;
      const membersPath = `/admin/course-users?course_id=${cid}`;
      const login = await ok('POST', '/auth/login', { username, password: username }, { auth: false });
      const asUser = async run => { const guruToken = token; token = login.token; try { await run(); } finally { token = guruToken; } };
      await asUser(async () => {
        await fails(403, 'GET', '/admin/users');
        await fails(403, 'GET', studentsPath);
      });
      await ok('POST', '/admin/course-users/assign', { course_id: cid, user_id: state.userId });
      expect((await ok('GET', membersPath)).some(user => Number(user.id) === state.userId), 'usuario no asignado');
      await asUser(async () => {
        expect(Array.isArray(await ok('GET', studentsPath)), 'el docente asignado debía poder leer el curso');
        expect((await ok('GET', '/courses')).some(course => course.id === cid), 'el curso debía figurar entre los propios');
      });
      await ok('POST', '/admin/course-users/unassign', { course_id: cid, user_id: state.userId });
      expect((await ok('GET', membersPath)).length === 0, 'usuario no desasignado');
      await asUser(() => fails(403, 'GET', studentsPath));
    });
  }
  console.log('\nEstudiantes');
  await check('alta de estudiantes', async () => {
    for (const [index, last] of ['Zeta', 'Alfa', 'Medio'].entries()) {
      const saved = await ok('POST', '/estudiantes/guardar', { course_id: cid, last_name: `${last} ${stamp}`, first_name: 'Prueba', legajo: `${legajo}${index}`, email_inst: '' });
      state.enrollments.push(saved.enrollment_id);
    }
    expect((await ok('GET', `/estudiantes?course_id=${cid}`)).length === 3, 'debían quedar 3 inscriptos');
  });
  await check('rechaza alta sin apellido', () => fails(422, 'POST', '/estudiantes/guardar', { course_id: cid, last_name: '', first_name: 'X' }));
  await check('rechaza alta sin legajo o con legajo largo', async () => {
    await fails(422, 'POST', '/estudiantes/guardar', { course_id: cid, last_name: 'Sin', first_name: 'Legajo' });
    await fails(422, 'POST', '/estudiantes/guardar', { course_id: cid, last_name: 'Legajo', first_name: 'Largo', legajo: '12345678901' });
  });
  await check('edita estudiante', async () => {
    await ok('POST', '/estudiantes/editar', { course_id: cid, enrollment_id: state.enrollments[0], observaciones: 'nota de prueba', status: 'ALTA' });
    const row = (await ok('GET', `/estudiantes?course_id=${cid}`)).find(item => Number(item.id) === state.enrollments[0]);
    expect(row.observaciones === 'nota de prueba', 'observación no guardada');
  });
  await check('importación (simulación y JSON)', async () => {
    const rows = [{ apellido: `Importado ${stamp}`, nombre: 'Uno', legajo: `${legajo}9` }, { apellido: '', nombre: 'Sin apellido' }];
    const dry = await ok('POST', `/estudiantes/bulk?course_id=${cid}&dry_run=1`, rows);
    expect(dry.dry_run === true && dry.inserted === 0 && dry.errors.length === 1, 'la simulación no debía insertar');
    const real = await ok('POST', `/estudiantes/bulk?course_id=${cid}`, rows);
    expect(real.inserted === 1 && real.errors.length === 1, 'debía insertar 1 y reportar 1 error');
  });
  await check('importación CSV (archivo)', async () => {
    const form = new FormData();
    form.append('file', new Blob([`apellido;nombre;legajo;email_inst\nCsv ${stamp};Dos;${legajo}8;\nSin Legajo;Tres;;\n`], { type: 'text/csv' }), 'alumnos.csv');
    const result = await ok('POST', `/estudiantes/bulk?course_id=${cid}&dry_run=0&format=standard`, undefined, { form });
    expect(result.inserted === 1 && result.errors.length === 1, `debía insertar 1 y rechazar la fila sin legajo (insertó ${result.inserted})`);
  });
  await check('reasigna IDs por orden alfabético', async () => {
    expect((await ok('POST', '/estudiantes/reasignar-ids', { course_id: cid, scope: 'ALTA' })).reassigned === 5, 'debía reasignar 5');
    const list = await ok('GET', `/estudiantes?course_id=${cid}`);
    expect(list[0].apellido.startsWith('Alfa'), 'el primero debía ser Alfa');
    state.enrollments = list.map(item => Number(item.id));
  });

  console.log('\nGrupos');
  await check('crea grupos', async () => {
    await ok('POST', '/grupos/crear', { course_id: cid, name: 'Equipo A' });
    await ok('POST', '/grupos/crear', { course_id: cid, name: null });
    state.groups = await ok('GET', `/grupos?course_id=${cid}`);
    expect(state.groups.length === 2 && state.groups[0].name === 'Equipo A', 'debían existir 2 grupos');
  });
  await check('asigna, mueve y quita miembros', async () => {
    await ok('POST', '/grupos/asignar', { course_id: cid, group_number: 1, enrollment_ids: state.enrollments.slice(0, 2) });
    expect((await ok('GET', `/grupos/miembros?course_id=${cid}&group_number=1`)).length === 2, 'el grupo 1 debía tener 2 miembros');
    await ok('POST', '/grupos/asignar', { course_id: cid, group_number: 2, enrollment_ids: [state.enrollments[1]] });
    await ok('POST', '/grupos/asignar', { course_id: cid, group_number: null, enrollment_ids: [state.enrollments[1]] });
    const groups = await ok('GET', `/grupos?course_id=${cid}`);
    expect(Number(groups[0].members) === 1 && Number(groups[1].members) === 0, 'conteo de miembros incorrecto');
    await ok('POST', '/grupos/asignar', { course_id: cid, group_number: 2, enrollment_ids: [state.enrollments[1]] });
  });
  await check('edita grupo y conformidad', async () => {
    await ok('POST', '/grupos/editar', { course_id: cid, group_number: 2, name: 'Equipo B', conformity_submitted: 1 });
    const group = (await ok('GET', `/grupos?course_id=${cid}`))[1];
    expect(group.name === 'Equipo B' && Number(group.conformity_submitted) === 1, 'edición no aplicada');
  });
  await check('rechaza grupo inexistente', () => fails(404, 'GET', `/grupos/miembros?course_id=${cid}&group_number=99`));

  console.log('\nTrabajos prácticos');
  await check('numeración sugerida y alta', async () => {
    expect((await ok('GET', `/entregas/next-number?course_id=${cid}&type=TP&term=1`)).next === 1, 'el próximo número debía ser 1');
    const created = await ok('POST', '/entregas/crear', { course_id: cid, type: 'TP', term: 1, topic: 'ORG', due_date: '2026-12-01', name: 'TP de prueba' });
    state.assignmentId = created.assignment.id;
    await ok('POST', '/entregas/crear', { course_id: cid, type: 'TPC', term: 2, topic: 'PLS', due_date: '', name: 'TPC de prueba' });
    await fails(400, 'POST', '/entregas/crear', { course_id: cid, type: 'XX', term: 1, topic: 'ORG', due_date: '', name: 'inválido' });
  });
  await check('entrega con tema libre ("Otro")', async () => {
    const created = await ok('POST', '/entregas/crear', { course_id: cid, type: 'TPR', term: 2, topic: ' bpmn ', due_date: '', name: 'Tema libre' });
    expect(created.assignment.topic === 'BPMN', `el tema libre debía guardarse normalizado (quedó "${created.assignment.topic}")`);
    await ok('POST', '/entregas/editar', { course_id: cid, assignment_id: created.assignment.id, topic: 'uml 2' });
    expect((await ok('GET', `/entregas?course_id=${cid}`)).assignments.find(item => item.id === created.assignment.id).topic === 'UML 2', 'el tema editado no se guardó');
    expect((await ok('GET', `/dashboard?course_id=${cid}`)).filters.topics.includes('UML 2'), 'el dashboard debía ofrecer el tema libre como filtro');
    await fails(400, 'POST', '/entregas/crear', { course_id: cid, type: 'TP', term: 1, topic: 'DEMASIADO LARGO', due_date: '', name: 'inválido' });
    await fails(400, 'POST', '/entregas/editar', { course_id: cid, assignment_id: created.assignment.id, topic: '<b>' });
    await ok('POST', '/entregas/eliminar', { course_id: cid, assignment_id: created.assignment.id, confirm: 'ELIMINAR' });
  });
  await check('edita, califica y marca devuelta', async () => {
    const groupIds = state.groups.map(group => Number(group.id));
    await ok('POST', '/entregas/editar', { course_id: cid, assignment_id: state.assignmentId, name: 'TP editado', topic: 'MET', due_date: '2026-12-15' });
    await ok('POST', '/entregas/calificar', { course_id: cid, assignment_id: state.assignmentId, group_id: groupIds[0], grade_code: 'SAT' });
    await ok('POST', '/entregas/calificar', { course_id: cid, assignment_id: state.assignmentId, group_id: groupIds[1], grade_code: 'NO_SAT' });
    await ok('POST', '/entregas/devolver', { course_id: cid, assignment_id: state.assignmentId, returned: 1 });
    const data = await ok('GET', `/entregas?course_id=${cid}&term=1`);
    expect(data.assignments.length === 1 && data.assignments[0].name === 'TP editado' && Number(data.assignments[0].returned) === 1, 'entrega no actualizada');
    expect(data.approval[groupIds[0]].ratio === 100 && data.approval[groupIds[1]].ratio === 0, 'aprobación por grupo incorrecta');
    await ok('POST', '/entregas/calificar', { course_id: cid, assignment_id: state.assignmentId, group_id: groupIds[1], grade_code: null });
    expect((await ok('GET', `/entregas?course_id=${cid}`)).grades.length === 1, 'la nota debía borrarse');
  });

  console.log('\nParciales, asistencia y cierre');
  const enrollment = state.enrollments[0];
  await check('carga notas de parcial', async () => {
    await ok('POST', '/parciales/guardar', { course_id: cid, enrollment_id: enrollment, partial: 1, topic: 'ORG', attempt: 'PA', grade_code: 'NO_SAT' });
    await ok('POST', '/parciales/guardar', { course_id: cid, enrollment_id: enrollment, partial: 1, topic: 'ORG', attempt: '1R', grade_code: 'SAT' });
    await fails(422, 'POST', '/parciales/guardar', { course_id: cid, enrollment_id: enrollment, partial: 1, topic: 'PLS', attempt: 'PA', grade_code: 'SAT' });
    await fails(422, 'POST', '/parciales/guardar', { course_id: cid, enrollment_id: enrollment, partial: 1, topic: 'ORG', attempt: 'PA', grade_code: 'INEXISTENTE' });
    const data = await ok('GET', `/parciales?course_id=${cid}`);
    const row = data.students.find(student => student.enrollment_id === enrollment);
    expect(row.p1.ORG['1R'] === 'SAT' && !row.adeuda_p1.includes('ORG') && row.adeuda_p1.includes('MET'), 'cálculo de adeudados incorrecto');
  });
  await check('asistencia a parciales', async () => {
    await ok('POST', '/asistencia/guardar', { course_id: cid, enrollment_id: enrollment, partial: 1, attempt: 'PA', present: 1, topics: { ORG: 1, MET: 0, TEO1: 1 } });
    const data = await ok('GET', `/asistencia?course_id=${cid}&partial=1&attempt=PA`);
    const row = data.students.find(student => student.enrollment_id === enrollment);
    expect(row.present === true && row.topics.ORG === true && row.topics.MET === false && row.approved_topics.ORG === 1, 'asistencia no guardada');
    expect(row.status === 'ALTA', 'la asistencia debía informar el estado del estudiante');
    await fails(422, 'GET', `/asistencia?course_id=${cid}&partial=3&attempt=PA`);
  });
  await check('cierre de asistencia: ausente y no entregado solo en temas adeudados', async () => {
    const [, second, , , dropped] = state.enrollments;
    const close = () => ok('POST', '/asistencia/cerrar', { course_id: cid, partial: 1, attempt: 'PA' });
    const grades = async id => (await ok('GET', `/parciales?course_id=${cid}`)).students.find(student => student.enrollment_id === id).p1;
    await ok('POST', '/estudiantes/editar', { course_id: cid, enrollment_id: dropped, status: 'BAJA' });

    // El primero está presente: ORG aprobado, MET sin entregar, TEO1 entregado. Los otros 3 en alta faltaron.
    const first = await close();
    expect(first.not_delivered === 1 && first.absent === 9 && first.students === 4 && first.kept === 0, `conteo inesperado: ${JSON.stringify(first)}`);
    const own = await grades(enrollment);
    expect(own.ORG.PA === 'NO_SAT' && own.MET.PA === 'N_E' && own.TEO1.PA === null, 'solo debía cargarse N_E en el tema adeudado y no entregado');
    expect((await grades(second)).ORG.PA === 'A', 'el ausente debía quedar con A');
    expect(Object.values(await grades(dropped)).every(topic => topic.PA === null), 'un estudiante de baja no debía recibir notas');

    // Una nota real no se pisa; un tema ya aprobado se saltea; lo automático se puede recalcular.
    await ok('POST', '/parciales/guardar', { course_id: cid, enrollment_id: second, partial: 1, topic: 'ORG', attempt: 'PA', grade_code: 'SAT' });
    await ok('POST', '/parciales/guardar', { course_id: cid, enrollment_id: second, partial: 1, topic: 'MET', attempt: 'PA', grade_code: 'NO_SAT' });
    const again = await close();
    expect(again.kept === 1 && again.absent === 7 && again.not_delivered === 1, `reapertura inesperada: ${JSON.stringify(again)}`);
    const kept = await grades(second);
    expect(kept.ORG.PA === 'SAT' && kept.MET.PA === 'NO_SAT' && kept.TEO1.PA === 'A', 'las notas reales debían conservarse');

    await fails(422, 'POST', '/asistencia/cerrar', { course_id: cid, partial: 1, attempt: 'XX' });
    await ok('POST', '/estudiantes/editar', { course_id: cid, enrollment_id: dropped, status: 'ALTA' });
  });
  await check('calificación final y SIU', async () => {
    const finals = async () => (await ok('GET', `/notas-finales?course_id=${cid}`)).students.find(student => student.enrollment_id === enrollment);
    await ok('POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, final_grade: 8, final_deserto: 0 });
    await ok('POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, siu_loaded: 1 });
    await fails(422, 'POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, final_grade: 11 });
    const row = await finals();
    expect(row.final_grade === 8 && row.final_condition === 'PROMOCIONA' && row.siu_loaded === 1 && row.tps_1c === 100, 'cierre incorrecto');
    await ok('POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, final_grade: null, final_deserto: 1 });
    const absent = await finals();
    expect(absent.final_condition === 'DESERTO' && absent.final_grade === null, 'ausente no aplicado');
    await ok('POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, final_grade: 5, final_deserto: 0 });
    await ok('POST', '/notas-finales/guardar', { course_id: cid, enrollment_id: enrollment, final_grade: null, final_deserto: 0 });
    const cleared = await finals();
    expect(cleared.final_grade === null && cleared.final_condition === null && cleared.siu_loaded === 1, 'la nota final debía poder borrarse sin tocar SIU');
  });
  await check('dashboard con filtros', async () => {
    const full = await ok('GET', `/dashboard?course_id=${cid}`);
    expect(full.tpStats.graded === 1 && full.tpStats.ratio === 100 && full.groupPerformance.length === 2, 'métricas de TPs incorrectas');
    expect(full.parcialStats.total === 5 && Array.isArray(full.alerts) && Array.isArray(full.tpHistory.points), 'métricas de parciales incorrectas');
    const filtered = await ok('GET', `/dashboard?course_id=${cid}&term=2&topic=PLS&group_id=${state.groups[0].id}&risk=70`);
    expect(filtered.groupPerformance.length === 1 && filtered.tpStats.graded === 0, 'los filtros no se aplicaron');
    await fails(422, 'GET', '/dashboard');
  });

  console.log('\nNovedades y recursos');
  await check('recursos', async () => {
    const saved = await ok('POST', '/reportes/resources/save', { title: `Recurso ${stamp}`, description: 'prueba', url: 'https://example.com', icon_emoji: '📘' });
    await ok('POST', '/reportes/resources/save', { id: saved.resource.id, title: `Recurso ${stamp} editado`, url: 'https://example.com' });
    expect((await ok('GET', '/reportes/config')).resources.some(item => item.title === `Recurso ${stamp} editado`), 'recurso no listado');
    await ok('POST', '/reportes/resources/delete', { id: saved.resource.id });
  });
  await check('novedades', async () => {
    const saved = await ok('POST', '/reportes/news/save', { title: `Novedad ${stamp}`, preview: 'prueba', body: 'cuerpo' });
    expect((await ok('GET', '/reportes/config')).news.some(item => item.id === saved.news.id), 'novedad no listada');
    await ok('POST', '/reportes/news/delete', { id: saved.news.id });
    await fails(422, 'POST', '/reportes/news/save', { title: '' });
  });
}

async function cleanup() {
  if (!token) return;
  console.log('\nLimpieza');
  const cid = state.courseId;
  if (state.assignmentId) await check('elimina entrega', async () => {
    await fails(400, 'POST', '/entregas/eliminar', { course_id: cid, assignment_id: state.assignmentId, confirm: 'no' });
    await ok('POST', '/entregas/eliminar', { course_id: cid, assignment_id: state.assignmentId, confirm: 'ELIMINAR' });
  });
  if (state.groups.length) await check('elimina grupo', () => ok('POST', '/grupos/eliminar', { course_id: cid, group_number: 2 }));
  if (state.enrollments.length) await check('elimina inscripciones', async () => {
    await fails(422, 'POST', '/estudiantes/eliminar', { course_id: cid, enrollment_ids: state.enrollments, confirm: 'no' });
    expect((await ok('POST', '/estudiantes/eliminar', { course_id: cid, enrollment_ids: state.enrollments, confirm: 'ELIMINAR' })).deleted === state.enrollments.length, 'no se eliminaron todas');
  });
  if (state.userId) await check('elimina usuario temporal', () => ok('POST', '/admin/users/delete', { user_id: state.userId, confirm: 'ELIMINAR' }));
  if (cid) await check('elimina curso temporal', async () => {
    await ok('POST', '/admin/courses/delete', { course_id: cid, confirm: 'ELIMINAR' });
    await fails(404, 'GET', `/courses/${cid}`);
  });
}

try {
  await main();
} catch (error) {
  failures.push('ejecución');
  console.log(`\nError inesperado: ${error.stack || error}`);
} finally {
  await cleanup().catch(error => { failures.push('limpieza'); console.log(`Error en limpieza: ${error.message}`); });
}

console.log(`\n${passed} verificaciones correctas, ${failures.length} con fallas.`);
if (state.enrollments.length) console.log(`Nota: las personas de prueba (legajo ${legajo}*) quedan en la tabla people; la API no ofrece borrarlas.`);
if (failures.length) {
  console.log(`Fallaron: ${failures.join(', ')}`);
  process.exitCode = 1;
}
