import { mount as mountController, unmount as unmountController } from '../../pages/grupos/grupos.js';

export const template = `<style>
    .grid-groups{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem}
    @media (max-width:900px){.grid-groups{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (max-width:640px){.grid-groups{grid-template-columns:1fr}}
    .group-card{padding:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}
    .small{font-size:.92rem;color:var(--muted)}
    .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:999}
    .modal{width:min(720px,96vw);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:1rem}
    .modal h3{margin:.2rem 0 1rem 0}
    .modal .actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}
    .tbl{border-collapse:collapse;width:100%} .tbl th,.tbl td{border:1px solid var(--border);padding:.45rem} .tbl th{background:color-mix(in oklab, var(--surface) 70%, var(--bg));text-align:left}
    /* === Estado de conformidad en tarjeta === */
    :root{
    --ok:#16a34a;       /* verde */
    --danger:#ef4444;   /* rojo */
    }
    .group-card.ok{
    border-color: var(--ok);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ok) 28%, transparent) inset;
    }
    .group-card.pending{
    border-color: var(--danger);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--danger) 28%, transparent) inset;
    }
  </style>
<main class="container">
    <div class="card">
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
        <button id="g_new" class="btn btn-primary">Crear grupo</button>
        <button id="g_assign_open" class="btn btn-tonal">Asignar alumnos</button>
        <div class="spacer"></div>
        <button id="g_refresh_top" class="btn btn-ghost">Actualizar</button>
      </div>
    </div>

    <div id="groups" class="grid-groups" style="margin-top:.9rem"></div>

    <div class="card" style="margin-top:.9rem">
      <h3 style="margin:.2rem 0 .6rem 0">Alumnos sin grupo</h3>
      <div id="noGroup"></div>
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