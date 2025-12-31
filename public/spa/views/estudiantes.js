import { mount as mountController, unmount as unmountController } from '../../pages/estudiantes/estudiantes.js';

export const template = `<style>
    .modal-back {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .35);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999
    }

    .modal {
      width: min(980px, 96vw);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 1rem
    }

    .modal h3 {
      margin: .2rem 0 1rem 0
    }

    .modal .actions {
      display: flex;
      gap: .5rem;
      justify-content: flex-end;
      margin-top: 1rem
    }

    .tbl {
      border-collapse: collapse;
      width: 100%
    }

    .tbl th,
    .tbl td {
      border: 1px solid var(--border);
      padding: .45rem
    }

    .tbl th {
      background: color-mix(in oklab, var(--surface) 70%, var(--bg));
      text-align: left
    }

    .small {
      font-size: .92rem;
      color: var(--muted)
    }
  </style>
<main class="container">
    <div class="bar" style="display:flex;gap:.5rem;align-items:center;margin-bottom:.8rem;flex-wrap:wrap">
      <button id="btnNew" class="btn btn-primary">Nuevo</button>
      <button id="btnBulk" class="btn btn-tonal">Cargar CSV</button>
      <button id="btnReid" class="btn btn-soft">Reasignar IDs (A→Z)</button>
      <button id="btnEdit" class="btn btn-neutral">Editar</button>
      <button id="btnDelete" class="btn btn-danger" style="display:none">Eliminar</button>
      <div class="spacer"></div>
      <select id="fltStatus" class="select select-lg" style="max-width:220px">
        <option value="ALL">Mostrar: todos</option>
        <option value="ALTA">Solo ALTA</option>
        <option value="BAJA">Solo BAJA</option>
      </select>
      <button id="btnRefresh" class="btn btn-ghost">Actualizar</button>
    </div>

    <div id="table" class="card"></div>
    <div id="summary" class="small" style="margin:.6rem 0 0 .2rem"></div>
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