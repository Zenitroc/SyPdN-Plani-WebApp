renderMenu();

function qs(id){ return document.getElementById(id); }
function esc(s){ return (s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

const partialFilter = qs('partialFilter');
const attemptFilter = qs('attemptFilter');
const content = qs('content');
const summary = qs('summary');
const btnDownloadXls = qs('btnDownloadXls');
const btnDownloadPdf = qs('btnDownloadPdf');

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
  if (!api.getToken()) { location.href = window.getPageRoute ? window.getPageRoute('home') : (BASE_APP + '/pages/home/'); return; }
  COURSE_ID = parseInt(await courseContext.require(), 10);

  partialFilter.onchange = load;
  attemptFilter.onchange = load;
  btnDownloadXls.onclick = downloadXls;
  btnDownloadPdf.onclick = downloadPdf;

  await load();
})();

async function load(){
  const partial = parseInt(partialFilter.value,10);
  const attempt = attemptFilter.value;
  const res = await apiGet(`?course_id=${COURSE_ID}&partial=${partial}&attempt=${attempt}`);
  const data = payload(res);
  students = data.students || [];
  currentTopics = data.topics || [];

  renderSummary();

  let html = '<table class="tbl"><thead><tr>'+
    '<th>ID</th><th>Apellido</th><th>Nombre</th><th>Presente</th>';
  currentTopics.forEach(t => { html += `<th>${t}</th>`; });
  html += '</tr></thead><tbody>';

  students.forEach(s => {
    const rowCls = s.present ? 'row-present' : '';
    html += `<tr data-enroll="${s.enrollment_id}" class="${rowCls}">`+
      `<td>${s.course_id_seq}</td>`+
      `<td>${esc(s.apellido)}</td>`+
      `<td>${esc(s.nombre)}</td>`+
      `<td><input type="checkbox" class="present check-btn"${s.present?' checked':''}></td>`;
    currentTopics.forEach(t => {
      const approved = s.approved_topics && s.approved_topics[t];
      const checked = s.topics[t] ? ' checked' : '';
      const dis = s.present ? '' : ' disabled';
      const cls = approved ? 'topic-approved' : (s.topics[t] ? 'topic-delivered' : 'topic-missing');
      const approvedAttr = approved ? ' data-approved="1"' : '';
      html += `<td class="${cls}"><input type="checkbox" class="topic check-btn" data-topic="${t}"${approvedAttr}${checked}${dis}></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  content.innerHTML = html;

  document.querySelectorAll('tbody .present').forEach(cb=>{
    cb.onchange = async ev => {
      const tr = ev.target.closest('tr');
      const en = parseInt(tr.getAttribute('data-enroll'),10);
      const present = ev.target.checked;
      tr.querySelectorAll('.topic').forEach(tcb => {
        tcb.disabled = !present;
        if (!present) tcb.checked = false;
      });
      updateRowStyles(tr);
      renderSummary();
      await save(en);
    };
  });
  document.querySelectorAll('tbody .topic').forEach(cb=>{
    cb.onchange = async ev => {
      const tr = ev.target.closest('tr');
      updateRowStyles(tr);
      renderSummary();
      const en = parseInt(tr.getAttribute('data-enroll'),10);
      await save(en);
    };
  });
  document.querySelectorAll('tbody tr').forEach(updateRowStyles);
}

function renderSummary(){
  if (!currentTopics.length) {
    summary.innerHTML = '';
    return;
  }

  let html = '<h2>Alumnos que adeudan por tema</h2>';
  html += '<table class="summary-table"><thead><tr><th>Tema</th><th>Cantidad</th></tr></thead><tbody>';

  currentTopics.forEach(topic => {
    const count = students.reduce((acc, student) => {
      const approved = !!(student.approved_topics && student.approved_topics[topic]);
      const delivered = !!(student.topics && student.topics[topic]);
      return acc + (!approved && !delivered ? 1 : 0);
    }, 0);
    html += `<tr><td>${esc(topic)}</td><td class="count">${count}</td></tr>`;
  });

  html += '</tbody></table>';
  summary.innerHTML = html;
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

function updateRowStyles(tr){
  const present = tr.querySelector('.present').checked;
  tr.classList.toggle('row-present', present);
  tr.querySelectorAll('.topic').forEach(cb => {
    const td = cb.parentElement;
    td.classList.remove('topic-delivered','topic-missing','topic-approved');
    if (cb.dataset.approved === '1') {
      td.classList.add('topic-approved');
      return;
    }
    td.classList.add(cb.checked ? 'topic-delivered' : 'topic-missing');
  });
}

function getTopicCellValue(cb){
  if (!cb) return '';
  if (cb.dataset.approved === '1') return 'Aprobado';
  return cb.checked ? 'Adeuda' : 'No adeuda';
}

function collectRows(){
  const rows = [];
  document.querySelectorAll('tbody tr').forEach(tr=>{
    const row = [];
    row.push(tr.children[0].textContent.trim());
    row.push(tr.children[1].textContent.trim());
    row.push(tr.children[2].textContent.trim());
    row.push(tr.querySelector('.present').checked ? 'Presente' : 'Ausente');
    currentTopics.forEach(t=>{
      const cb = tr.querySelector(`.topic[data-topic="${t}"]`);
      row.push(getTopicCellValue(cb));
    });
    rows.push(row);
  });
  return rows;
}

function isGrayTopicValue(value){
  return value === 'No adeuda' || value === 'Aprobado';
}

function downloadXls(){
  const rows = collectRows();
  if(!rows.length){ alert('No hay estudiantes para exportar'); return; }
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  rows.forEach((row, rowIdx) => {
    currentTopics.forEach((_, topicIdx) => {
      const value = row[4 + topicIdx];
      if (!isGrayTopicValue(value)) return;
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 4 + topicIdx });
      if (!ws[cellRef]) return;
      ws[cellRef].s = {
        fill: { patternType: 'solid', fgColor: { rgb: 'D1D5DB' } },
        font: { color: { rgb: '374151' } }
      };
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, 'asistencia.xlsx');
}

function downloadPdf(){
  const rows = collectRows();
  if(!rows.length){ alert('No hay estudiantes para exportar'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  doc.autoTable({
    head: [header],
    body: rows,
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index < 4) return;
      if (isGrayTopicValue(data.cell.raw)) {
        data.cell.styles.fillColor = [229, 231, 235];
        data.cell.styles.textColor = [55, 65, 81];
      }
    }
  });
  doc.save('asistencia.pdf');
}