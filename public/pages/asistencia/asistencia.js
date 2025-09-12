renderMenu();

function qs(id){ return document.getElementById(id); }
function esc(s){ return (s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

const partialFilter = qs('partialFilter');
const attemptFilter = qs('attemptFilter');
const content = qs('content');
const btnExportCsv = qs('btnExportCsv');
const btnExportPdf = qs('btnExportPdf');

let COURSE_ID = null;
let students = [];
let currentTopics = [];

const API_BASES = ['/api/asistencia', '/asistencia'];
let apiBaseIdx = 0;

function isNotFound(val){
  const msg = String(val?.message || val?.error || val || '').toLowerCase();
  return msg.includes('not found') || msg.includes('404');
}

async function apiGet(path) {
  try {
    const r = await api.get(API_BASES[apiBaseIdx] + path);
    if (r && r.error && isNotFound(r) && apiBaseIdx === 0) { apiBaseIdx = 1; return await api.get(API_BASES[apiBaseIdx] + path); }
    return r;
  } catch (e) {
    if (isNotFound(e) && apiBaseIdx === 0) { apiBaseIdx = 1; return await api.get(API_BASES[apiBaseIdx] + path); }
    throw e;
  }
}
async function apiPost(path, body) {
  try {
    const r = await api.post(API_BASES[apiBaseIdx] + path, body);
    if (r && r.error && isNotFound(r) && apiBaseIdx === 0) { apiBaseIdx = 1; return await api.post(API_BASES[apiBaseIdx] + path, body); }
    return r;
  } catch (e) {
    if (isNotFound(e) && apiBaseIdx === 0) { apiBaseIdx = 1; return await api.post(API_BASES[apiBaseIdx] + path, body); }
    throw e;
  }
}

function payload(res){ return (res && typeof res==='object' && 'data' in res) ? res.data : res; }

(async function(){
  if (!api.getToken()) { location.href = BASE_APP + '/public/pages/home/'; return; }
  COURSE_ID = parseInt(await courseContext.require(), 10);

  partialFilter.onchange = load;
  attemptFilter.onchange = load;
  btnExportCsv.onclick = exportCsv;
  btnExportPdf.onclick = exportPdf;

  await load();
})();

async function load(){
  const partial = parseInt(partialFilter.value,10);
  const attempt = attemptFilter.value;
  const res = await apiGet(`?course_id=${COURSE_ID}&partial=${partial}&attempt=${attempt}`);
  const data = payload(res);
  students = data.students || [];
  currentTopics = data.topics || [];

  let html = '<table class="tbl"><thead><tr>'+
    '<th><input type="checkbox" id="selAll"></th>'+
    '<th>ID</th><th>Apellido</th><th>Nombre</th><th>Presente</th>';
  currentTopics.forEach(t => { html += `<th>${t}</th>`; });
  html += '</tr></thead><tbody>';

  students.forEach(s => {
    html += `<tr data-enroll="${s.enrollment_id}">`+
      '<td><input type="checkbox" class="sel"></td>'+
      `<td>${s.course_id_seq}</td>`+
      `<td>${esc(s.apellido)}</td>`+
      `<td>${esc(s.nombre)}</td>`+
      `<td><input type="checkbox" class="present"${s.present?' checked':''}></td>`;
    currentTopics.forEach(t => {
      const checked = s.topics[t] ? ' checked' : '';
      const dis = s.present ? '' : ' disabled';
      html += `<td><input type="checkbox" class="topic" data-topic="${t}"${checked}${dis}></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  content.innerHTML = html;

  qs('selAll').onchange = (ev)=>{
    document.querySelectorAll('tbody .sel').forEach(cb=>cb.checked=ev.target.checked);
  };
  document.querySelectorAll('tbody .present').forEach(cb=>{
    cb.onchange = async ev => {
      const tr = ev.target.closest('tr');
      const en = parseInt(tr.getAttribute('data-enroll'),10);
      const present = ev.target.checked;
      tr.querySelectorAll('.topic').forEach(tcb => { tcb.disabled = !present; if(!present) tcb.checked = false; });
      await save(en);
    };
  });
  document.querySelectorAll('tbody .topic').forEach(cb=>{
    cb.onchange = async ev => {
      const tr = ev.target.closest('tr');
      const en = parseInt(tr.getAttribute('data-enroll'),10);
      await save(en);
    };
  });
}

async function save(enrollId){
  const tr = document.querySelector(`tr[data-enroll="${enrollId}"]`);
  const present = tr.querySelector('.present').checked ? 1 : 0;
  const topics = {};
  tr.querySelectorAll('.topic').forEach(cb => { topics[cb.getAttribute('data-topic')] = cb.checked ? 1 : 0; });
  const body = {
    course_id: COURSE_ID,
    enrollment_id: enrollId,
    partial: parseInt(partialFilter.value,10),
    attempt: attemptFilter.value,
    present,
    topics
  };
  try { await apiPost('/guardar', body); } catch(e){ console.error(e); }
}

function collectSelected(){
  const rows = [];
  document.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('.sel').checked){
      const row = [];
      row.push(tr.children[1].textContent.trim());
      row.push(tr.children[2].textContent.trim());
      row.push(tr.children[3].textContent.trim());
      row.push(tr.querySelector('.present').checked ? 'Presente' : 'Ausente');
      currentTopics.forEach(t=>{
        const cb = tr.querySelector(`.topic[data-topic="${t}"]`);
        row.push(cb && cb.checked ? 'Entregado' : '');
      });
      rows.push(row);
    }
  });
  return rows;
}

function exportCsv(){
  const rows = collectSelected();
  if(!rows.length){ alert('Seleccioná al menos un estudiante'); return; }
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  const lines = [header.join(',')];
  rows.forEach(r => lines.push(r.map(v=>`"${v}"`).join(',')));
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'asistencia.csv';
  a.click();
}

function exportPdf(){
  const rows = collectSelected();
  if(!rows.length){ alert('Seleccioná al menos un estudiante'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  doc.text(header.join(' | '), 10, y);
  y += 8;
  rows.forEach(r => { doc.text(r.join(' | '), 10, y); y += 8; });
  doc.save('asistencia.pdf');
}