import { mount as mountController, unmount as unmountController } from '../../pages/planificacion/planificacion.js';

export const template = `<main class="container">
    <h1 style="display:none">Planificación</h1>
    <div id="msg" class="card" style="margin-bottom:1rem"></div>
    <iframe id="planFrame" style="width:100%;height:80vh;border:0"></iframe>
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