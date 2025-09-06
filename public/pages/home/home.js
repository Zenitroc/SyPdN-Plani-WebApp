renderMenu();

(async function init() {
  const loginBox = document.getElementById('loginBox');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');
  const courseBox = document.getElementById('courseBox');
  const courseSelect = document.getElementById('courseSelect');
  const goStudents = document.getElementById('goStudents');

  // Si no hay token, mostrar login
  if (!api.getToken()) {
    loginBox.style.display = 'block';
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      loginMsg.textContent = '';
      try {
        const r = await api.post('/auth/login', {
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value
        }, { noAuth: true });
        api.setToken(r.token);
        location.reload();
      } catch (err) {
        loginMsg.textContent = err.message || 'Error de login';
      }
    };
    return;
  }

  // Con token: cargar usuario y cursos
  try {
    const me = await api.get('/me');
    const list = me.roles.includes('GURU')
      ? await api.get('/courses?scope=all')
      : await api.get('/courses');

    // Render selector
    courseSelect.innerHTML = list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const saved = courseContext.get();
    if (saved) courseSelect.value = saved;
    courseBox.style.display = 'block';

    courseSelect.onchange = async () => {
      await api.post('/session/course', { course_id: Number(courseSelect.value) });
      courseContext.set(Number(courseSelect.value));
    };
    goStudents.onclick = async () => {
      if (!courseSelect.value) return;
      await api.post('/session/course', { course_id: Number(courseSelect.value) });
      courseContext.set(Number(courseSelect.value));
      location.href = BASE_APP + '/public/pages/estudiantes/';
    };

    // KPIs placeholder
    document.getElementById('kpis').innerHTML = `
      <div style="padding:.75rem;border:1px dashed #ccc;border-radius:.5rem">
        <b>Bienvenido, ${me.name}</b>. Seleccioná una comisión para comenzar.
      </div>`;
  } catch (e) {
    // Token inválido/expirado → limpiar y pedir login
    api.clearToken();
    location.reload();
  }
})();
