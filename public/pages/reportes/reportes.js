renderMenu();

const modal = document.getElementById('reportModal');
const btnOpen = document.getElementById('btnReport');
const btnCancel = document.getElementById('r_cancel');
const btnSend = document.getElementById('r_send');

btnOpen.addEventListener('click', () => { modal.style.display = 'flex'; });
btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });

btnSend.addEventListener('click', async () => {
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