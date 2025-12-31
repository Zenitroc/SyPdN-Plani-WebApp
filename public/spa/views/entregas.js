import { mount as mountController, unmount as unmountController } from '../../pages/entregas/entregas.js';

export const template = `<style>
    /* Modal + tabla (igual a tu versión) */
    .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:999}
    .modal{width:min(820px,96vw);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:1rem}
    .modal h3{margin:.2rem 0 1rem 0}
    .modal .actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}
    .tbl{border-collapse:collapse;width:100%}
    .tbl th,.tbl td{padding:.55rem;border-bottom:1px solid var(--border);text-align:left}
    .tbl th{position:sticky;top:0;background:color-mix(in oklab, var(--surface) 70%, var(--bg));z-index:1}
    .scroll-x{overflow-x:auto}
    .small{font-size:.92rem;color:var(--muted)}
    .badge{display:inline-block;padding:.2rem .55rem;border:1px solid var(--border);border-radius:999px;font-size:.9rem;background:color-mix(in oklab,var(--surface) 85%, var(--bg))}
    .badge.ok{border-color:#16a34a;color:#16a34a}
    .badge.danger{border-color:#ef4444;color:#ef4444}
    .row{display:flex;gap:.5rem;align-items:center}
    .spacer{flex:1}
    .link{background:none;border:none;color:var(--link);cursor:pointer;padding:.1rem .25rem}
    .link:disabled{opacity:.5;cursor:not-allowed}
  </style>
<main class="container">
    <div class="card">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap">
        <h1 style="margin:.2rem 0">Entregas (Trabajos Prácticos)</h1>
        <div class="row" style="gap:.5rem">
          <label class="row">
            <span>Cuatrimestre:</span>
            <select id="termFilter" class="select" style="max-width:180px">
              <option value="ALL">General</option>
              <option value="1">1° Cuatri</option>
              <option value="2">2° Cuatri</option>
            </select>
          </label>
          <div class="spacer"></div>
          <button id="btnNew" class="btn btn-primary">+ Nueva entrega</button>
        </div>
      </div>
      <div id="content" style="margin-top:.8rem"></div>
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