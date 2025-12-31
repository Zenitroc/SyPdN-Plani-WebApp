import { mount as mountController, unmount as unmountController } from '../../pages/home/home.js';

export const template = `<style>
    .row{display:flex;gap:.6rem;align-items:center}
    .row-between{display:flex;gap:.6rem;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .6rem;border-radius:999px;border:1px solid var(--border);font-size:.85rem}
    .user-card{border:1px solid var(--border);border-radius:var(--radius);padding:.75rem;background:color-mix(in oklab, var(--surface) 90%, var(--bg))}
    .user-card.active{border-color:color-mix(in oklab, var(--primary) 45%, var(--border));background:color-mix(in oklab, var(--primary) 10%, var(--surface))}
    .user-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1px solid var(--border)}
    .user-avatar.fallback{display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;background:color-mix(in oklab, var(--surface) 80%, var(--bg))}
  </style>
<main class="container" id="main">
    <h1 style="display:none">Home</h1>


    <!-- Barra curso seleccionado -->
    <section id="selectedCourse" class="card" style="display:none;margin-top:1rem"></section>
    <section id="kpis" style="margin-top:1rem"></section>
    <!-- Grid de comisiones (cards) -->
    <section id="courseBox" class="card" style="display:none;margin-top:1rem">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <div>
          <div class="label">Tus comisiones</div>
          <small class="hint">Elegí la comisión que querés gestionar.</small>
        </div>
        <div class="row" style="gap:.4rem">
          <input id="searchInput" class="input" placeholder="Buscar comisión / año / cuatri" style="min-width:220px">
        </div>
      </div>
      <div id="courseGrid" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:.75rem"></div>
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