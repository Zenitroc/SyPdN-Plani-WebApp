renderMenu();

let ALL = [];
let FILTER = '';

(function ensureGuru(){
  // Guard: solo Gurú
  api.get('/me').then(me => {
    if (!me.roles.includes('GURU')) {
      alert('Solo disponible para Gurú');
      location.href = BASE_APP + '/pages/home/';
    }
  }).catch(()=>location.href = BASE_APP + '/pages/home/');
})();

function rowHTML(r){
  return `<tr>
    <td>${r.apellido}</td>
    <td>${r.nombre}</td>
    <td>${r.legajo ?? ''}</td>
    <td>${r.email_inst ?? ''}</td>
    <td>${r.course_name}</td>
    <td>${r.course_student_id}</td>
    <td>${r.status}</td>
  </tr>`;
}

function render(){
  const q = (FILTER||'').toLowerCase();
  const rows = !q ? ALL : ALL.filter(r => {
    return [r.apellido, r.nombre, r.legajo||'', r.email_inst||'', r.course_name||'', String(r.course_student_id||'')]
      .join(' ').toLowerCase().includes(q);
  });
  document.getElementById('summary').textContent = `${rows.length} de ${ALL.length} estudiantes`;
  const table = `
    <table class="tbl">
      <tr>
        <th>Apellido</th><th>Nombre</th>
        <th>Legajo</th><th>Email</th>
        <th>Curso</th><th>ID (curso)</th><th>Estado</th>
      </tr>
      ${rows.map(rowHTML).join('')}
    </table>`;
  document.getElementById('table').innerHTML = table;
}

async function load(){
  // cursos del Gurú
  const courses = await api.get('/courses?scope=all');
  // juntar estudiantes de todos los cursos
  const chunks = await Promise.all(
    courses.map(c => api.get(`/estudiantes?course_id=${c.id}`).then(list =>
      list.map(x => ({
        apellido: x.apellido,
        nombre: x.nombre,
        legajo: x.legajo,
        email_inst: x.email_inst,
        course_id: c.id,
        course_name: c.name,
        course_student_id: x.course_id_seq,
        status: x.status
      }))
    ))
  );
  ALL = chunks.flat().sort((a,b)=>{
    const la = (a.apellido||'') + (a.nombre||'');
    const lb = (b.apellido||'') + (b.nombre||'');
    return la.localeCompare(lb,'es');
  });
  render();
}

document.getElementById('q').addEventListener('input', (e)=>{ FILTER=e.target.value; render(); });
document.getElementById('refresh').addEventListener('click', load);

load();
