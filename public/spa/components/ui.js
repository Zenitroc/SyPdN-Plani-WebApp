const escapeHtml = (s) => (s ?? '').toString().replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[m]));

export function Button({
  label,
  variant = 'primary',
  type = 'button',
  extraClass = '',
  attrs = '',
} = {}) {
  return `<button type="${escapeHtml(type)}" class="btn btn-${escapeHtml(variant)} ${escapeHtml(extraClass)}" ${attrs}>${escapeHtml(label)}</button>`;
}

export function Card({ title = '', body = '', footer = '', extraClass = '' } = {}) {
  return `
    <section class="card ${escapeHtml(extraClass)}">
      ${title ? `<div class="card-header"><h3>${escapeHtml(title)}</h3></div>` : ''}
      ${body ? `<div class="card-body">${body}</div>` : ''}
      ${footer ? `<div class="card-footer">${footer}</div>` : ''}
    </section>
  `;
}

export function Table({ headers = [], rows = [] } = {}) {
  const thead = headers.length
    ? `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`
    : '';
  const tbody = rows.length
    ? `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<div class="table-wrap"><table class="table">${thead}${tbody}</table></div>`;
}

export function Form({ fields = '', actions = '' } = {}) {
  return `
    <form class="form">
      ${fields}
      ${actions ? `<div class="form-actions">${actions}</div>` : ''}
    </form>
  `;
}

export function Modal({ title = '', body = '', footer = '' } = {}) {
  return `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="btn btn-ghost btn-icon" type="button" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
}

export function Toast({ title = '', message = '', tone = 'success' } = {}) {
  return `
    <div class="toast toast--${escapeHtml(tone)}">
      <div>
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
    </div>
  `;
}