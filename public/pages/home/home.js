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
    if (loginBox) loginBox.style.display = 'block';
    if (loginForm) {
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
    }
    return;
  }

  if (mainEl) mainEl.classList.remove('center-screen');

  try {
    const me = await api.get('/me');
    const list = me.roles.includes('GURU')
      ? await api.get('/courses?scope=all')
      : await api.get('/courses');

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

    // KPIs + botón solo Gurú
    const guruBtn = me.roles.includes('GURU')
      ? `<div class="login-actions" style="justify-content:flex-start;margin-top:.75rem">
           <button id="goAllStudents" class="btn btn-tonal">Todos los estudiantes</button>
         </div>`
      : '';

    document.getElementById('kpis').innerHTML = `
      <div class="card fx-pop">
        <b>Bienvenido, ${me.name}</b>. Seleccioná una comisión para comenzar.
        ${guruBtn}
      </div>`;

    if (me.roles.includes('GURU')) {
      document.getElementById('goAllStudents').onclick = () => {
        location.href = BASE_APP + '/public/pages/alumnos-global/';
      };
    }
  } catch (e) {
    api.clearToken();
    location.reload();
  }
})();
