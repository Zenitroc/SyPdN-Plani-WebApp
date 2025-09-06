renderMenu();

(async function init() {
  const mainEl = document.getElementById('main') || document.querySelector('main');
  const loginBox = document.getElementById('loginBox');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');
  const courseBox = document.getElementById('courseBox');
  const courseSelect = document.getElementById('courseSelect');
  const goStudents = document.getElementById('goStudents');

  // Si no hay token, mostrar login centrado
  if (!api.getToken()) {
    if (mainEl) mainEl.classList.add('center-screen');
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

  // Con token → vista normal (sin centrado)
  if (mainEl) mainEl.classList.remove('center-screen');

  try {
    const me = await api.get('/me');
    const list = me.roles.includes('GURU')
      ? await api.get('/courses?scope=all')
      : await api.get('/courses');

    // Popular opciones
    courseSelect.innerHTML = list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Restaurar selección guardada (si existe)
    const saved = courseContext.get();
    if (saved && list.some(c => String(c.id) === String(saved))) {
      courseSelect.value = String(saved);
    }

    // 🔹 Mejora visual: select custom (dropdown moderno)
    //    Asegurate de tener cargado ui-select.js en index.html
   

    // Mostrar bloque de curso
    courseBox.style.display = 'block';

    courseSelect.onchange = async () => {
      const cid = Number(courseSelect.value);
      await api.post('/session/course', { course_id: cid });
      courseContext.set(cid);
    };

    goStudents.onclick = async () => {
      const cid = Number(courseSelect.value);
      if (!cid) return;
      await api.post('/session/course', { course_id: cid });
      courseContext.set(cid);
      location.href = BASE_APP + '/public/pages/estudiantes/';
    };

    document.getElementById('kpis').innerHTML = `
      <div class="card"><b>Bienvenido, ${me.name}</b>. Seleccioná una comisión para comenzar.</div>`;
  } catch (e) {
    api.clearToken();
    location.reload();
  }
})();
