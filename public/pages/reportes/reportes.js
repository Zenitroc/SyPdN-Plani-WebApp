window.appNavigate = window.appNavigate || function (path) { location.href = path; };
function navigateTo(path) { window.appNavigate(path); }

let cleanup = null;

export function mount() {
  renderMenu();
  const modal = document.getElementById('reportModal');
  const btnOpen = document.getElementById('btnReport');
  const btnCancel = document.getElementById('r_cancel');
  const btnSend = document.getElementById('r_send');

  const listeners = [];
  const addListener = (el, event, handler) => {
    if (!el) return;
    el.addEventListener(event, handler);
    listeners.push(() => el.removeEventListener(event, handler));
  };

  addListener(btnOpen, 'click', () => { modal.style.display = 'flex'; });
  addListener(btnCancel, 'click', () => { modal.style.display = 'none'; });

  addListener(btnSend, 'click', async () => {
    const type = document.getElementById('r_type').value;
    const message = document.getElementById('r_message').value.trim();
    const link = document.getElementById('r_link').value.trim();
    const file = document.getElementById('r_image').files[0];

    let imageData = null;
    if (file) {
      imageData = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
    }

    try {
      await api.post('/reportes', { type, message, link, image: imageData });
      alert('Reporte enviado. ¡Gracias!');
      modal.style.display = 'none';
      document.getElementById('r_message').value = '';
      document.getElementById('r_link').value = '';
      document.getElementById('r_image').value = '';
    } catch (err) {
      alert('Error al enviar reporte: ' + err.message);
    }
  });

  cleanup = () => listeners.forEach((fn) => fn());
}

export function unmount() {
  if (cleanup) cleanup();
  cleanup = null;
}