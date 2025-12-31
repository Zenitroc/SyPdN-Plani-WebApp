import { mount as mountController, unmount as unmountController } from '../../pages/reportes/reportes.js';

export const template = `<style>
    .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:999}
    .modal{width:min(520px,96vw);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:1rem}
    .modal h3{margin:.2rem 0 1rem 0}
    .modal .actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}
  </style>
<main class="container">
    <div class="card">
      <h1>Centro de reportes y novedades</h1>
      <p>Acá se publicarán actualizaciones, comentarios y links importantes de la cátedra.</p>
      <button id="btnReport" class="btn btn-primary">Enviar reporte</button>
    </div>
  </main>`;

export async function mount(ctx) {
  if (typeof mountController === 'function') {
    return mountController(ctx);
  }
}

export function unmount(ctx) {
  if (typeof unmountController === 'function') {
    return unmountController(ctx);
  }
}