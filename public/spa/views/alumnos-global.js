import { mount as mountController, unmount as unmountController } from '../../pages/alumnos-global/global.js';

export const template = `<style>
    .topbar{display:flex;gap:.6rem;align-items:center;margin-bottom:.8rem}
    .topbar .spacer{flex:1}
    .flt{max-width:280px}
    .tbl{border-collapse:collapse;width:100%}
    .tbl th,.tbl td{border:1px solid var(--border);padding:.45rem}
    .tbl th{background:color-mix(in oklab, var(--surface) 70%, var(--bg));text-align:left}
    .small{font-size:.92rem;color:var(--muted)}
  </style>
<main class="container">
    <div class="topbar">
      <h3 style="margin:0">Todos los estudiantes</h3>
      <div class="spacer"></div>
      <input id="q" class="input flt" placeholder="Filtrar por nombre, legajo, email o curso">
      <button id="refresh" class="btn btn-ghost">Actualizar</button>
    </div>
    <div id="summary" class="small" style="margin-bottom:.5rem"></div>
    <div id="table" class="card"></div>
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