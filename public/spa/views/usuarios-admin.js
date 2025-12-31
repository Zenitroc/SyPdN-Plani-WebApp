import { mount as mountController, unmount as unmountController } from '../../pages/usuarios-admin/usuarios-admin.js';

export const template = `<style>
    .row{display:flex;gap:.6rem;align-items:center}
    .row-between{display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .6rem;border-radius:999px;border:1px solid var(--border);font-size:.85rem}
    .user-card{border:1px solid var(--border);border-radius:var(--radius);padding:.75rem;background:color-mix(in oklab, var(--surface) 90%, var(--bg))}
    .user-card.active{border-color:color-mix(in oklab, var(--primary) 45%, var(--border));background:color-mix(in oklab, var(--primary) 10%, var(--surface))}
    .user-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1px solid var(--border)}
    .user-avatar.fallback{display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;background:color-mix(in oklab, var(--surface) 80%, var(--bg))}
    .modal-back{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:999}
    .modal{width:min(980px,96vw);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:1rem}
    .modal h3{margin:.2rem 0 1rem 0}
    .modal .actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}
  </style>
<main class="container">
    <section class="card">
      <div class="row-between">
        <div>
          <h1 style="margin:.2rem 0">Gestor de usuarios</h1>
          <small class="hint">Administrá usuarios, roles y cursos asignados.</small>
        </div>
        <div class="row" style="gap:.5rem">
          <input id="userSearch" class="input" placeholder="Buscar por nombre, usuario o email" style="min-width:240px">
          <button id="btnToggleCreate" class="btn btn-primary">+ Nuevo usuario</button>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:1rem">
        <div>
          <div id="userList" class="grid" style="gap:.75rem"></div>
        </div>
        <div>
          <div id="userDetail" class="card" style="min-height:200px">
            <div class="muted">Seleccioná un usuario para ver el detalle.</div>
          </div>
        </div>
      </div>
    </section>
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