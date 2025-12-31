indow.appNavigate = window.appNavigate || function (path) { location.href = path; };
function navigateTo(path) { window.appNavigate(path); }

function qs(id){ return document.getElementById(id); }
function esc(s){ return (s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

let partialFilter = null;
let attemptFilter = null;
let content = null;
let btnDownloadXls = null;
let btnDownloadPdf = null;

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

function loadScript(src, test) {
  if (typeof test === 'function' && test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll('script')).find(s => s.src === src);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureExportLibs() {
  await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', () => window.jspdf);
  await loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.28/dist/jspdf.plugin.autotable.min.js', () => window.jspdf?.jsPDF?.API?.autoTable);
  await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', () => window.XLSX);
}

export async function mount() {
  renderMenu();
  partialFilter = qs('partialFilter');
  attemptFilter = qs('attemptFilter');
  content = qs('content');
  btnDownloadXls = qs('btnDownloadXls');
  btnDownloadPdf = qs('btnDownloadPdf');

  await ensureExportLibs();

  if (!api.getToken()) { navigateTo(BASE_APP + '/public/pages/home/'); return; }
  COURSE_ID = parseInt(await courseContext.require(), 10);

  partialFilter.onchange = load;
  attemptFilter.onchange = load;
  btnDownloadXls.onclick = downloadXls;
  btnDownloadPdf.onclick = downloadPdf;

  await load();
}

export function unmount() {
  if (partialFilter) partialFilter.onchange = null;
  if (attemptFilter) attemptFilter.onchange = null;
  if (btnDownloadXls) btnDownloadXls.onclick = null;
  if (btnDownloadPdf) btnDownloadPdf.onclick = null;
  partialFilter = null;
  attemptFilter = null;
  content = null;
  btnDownloadXls = null;
  btnDownloadPdf = null;
}

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
    const rowCls = s.present ? 'row-present' : '';
    html += `<tr data-enroll="${s.enrollment_id}" class="${rowCls}">`+
      '<td><input type="checkbox" class="sel"></td>'+
      `<td>${s.course_id_seq}</td>`+
      `<td>${esc(s.apellido)}</td>`+
      `<td>${esc(s.nombre)}</td>`+
      `<td><input type="checkbox" class="present"${s.present?' checked':''}></td>`;
    currentTopics.forEach(t => {
      const checked = s.topics[t] ? ' checked' : '';
      const dis = s.present ? '' : ' disabled';
      const cls = s.topics[t] ? 'topic-delivered' : 'topic-missing';
      html += `<td class="${cls}"><input type="checkbox" class="topic" data-topic="${t}"${checked}${dis}></td>`;
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
      updateRowStyles(tr);
      await save(en);
    };
  });
  document.querySelectorAll('tbody .topic').forEach(cb=>{
    cb.onchange = async ev => {
      const tr = ev.target.closest('tr');
      updateRowStyles(tr);
      const en = parseInt(tr.getAttribute('data-enroll'),10);
      await save(en);
    };
  });
  document.querySelectorAll('tbody tr').forEach(updateRowStyles);
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
    td.classList.remove('topic-delivered','topic-missing');
    td.classList.add(cb.checked ? 'topic-delivered' : 'topic-missing');
  });
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

function downloadXls(){
  const rows = collectSelected();
  if(!rows.length){ alert('Seleccioná al menos un estudiante'); return; }
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
  XLSX.writeFile(wb, 'asistencia.xlsx');
}

function downloadPdf(){
  const rows = collectSelected();
  if(!rows.length){ alert('Seleccioná al menos un estudiante'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const header = ['ID','Apellido','Nombre','Presente', ...currentTopics];
  doc.autoTable({ head: [header], body: rows });
  doc.save('asistencia.pdf');
}