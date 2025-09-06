renderMenu();

function renderTable(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!rows || !rows.length) { el.innerHTML = '<p>No hay estudiantes cargados.</p>'; return; }
  const th = `<tr>
    <th>ID</th><th>Estado</th><th>Apellido</th><th>Nombre</th>
    <th>Legajo</th><th>Email</th><th>Grupo</th><th>Obs</th>
  </tr>`;
  const tr = rows.map(r => `<tr>
    <td>${r.course_id_seq ?? ''}</td>
    <td>${r.status ?? ''}</td>
    <td>${r.apellido ?? ''}</td>
    <td>${r.nombre ?? ''}</td>
    <td>${r.legajo ?? ''}</td>
    <td>${r.email_inst ?? ''}</td>
    <td>${r.group_no ?? ''}</td>
    <td>${r.observaciones ?? ''}</td>
  </tr>`).join('');
  el.innerHTML = `
    <style>
      table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:.4rem}
      th{background:#f5f5f5;text-align:left}
    </style>
    <table>${th}${tr}</table>`;
}

(async function () {
  if (!api.getToken()) { location.href = BASE_APP + '/public/pages/home/'; return; }
  const courseId = await courseContext.require();
  try {
    const data = await api.get(`/estudiantes?course_id=${courseId}`);
    renderTable('table', data);
    // “Tiempo real” simple: refresh cada 15s
    setInterval(async () => {
      const d = await api.get(`/estudiantes?course_id=${courseId}`);
      renderTable('table', d);
    }, 15000);
  } catch (e) {
    alert(e.message || 'Error cargando estudiantes');
  }
})();
