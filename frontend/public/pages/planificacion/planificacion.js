(async function () {
  renderMenu();
  const courseId = await courseContext.require();
  const msg = document.getElementById('msg');
  const frame = document.getElementById('planFrame');
  msg.textContent = 'Cargando planificación...';
  try {
    const { course } = await api.get(`/planificacion?course_id=${courseId}`);
    const url = course?.plan_url;
    if (url) {
      frame.src = url;
      msg.style.display = 'none';
    } else {
      msg.textContent = 'No hay planificación cargada para este curso.';
    }
  } catch (err) {
    msg.textContent = 'Error al cargar planificación: ' + err.message;
  }
})();