import { mount as mountController, unmount as unmountController } from '../../pages/curso-dashboard/dashboard.js';

export const template = `
<main class="container" id="main">
  <section class="card">
    <h3 class="m0">Dashboard</h3>
    <p class="muted">Panel de indicadores del curso en preparación.</p>
  </section>
</main>
`;

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