import { mount as mountController, unmount as unmountController } from '../../pages/asistencia/asistencia.js';

export const template = `<style>
        .toolbar {
            display: flex;
            gap: .5rem;
            align-items: center;
            flex-wrap: wrap;
            margin: .75rem 0
        }

        .toolbar .spacer {
            flex: 1
        }

        table.tbl {
            border-collapse: collapse;
            width: 100%
        }

        .tbl th,
        .tbl td {
            border-bottom: 1px solid var(--border);
            padding: .45rem .55rem;
            text-align: left;
            white-space: nowrap
        }

        .row-present {
            background: #d1fae5
        }

        .topic-delivered {
            background: #bfdbfe
        }

        .topic-missing {
            background: #fecaca
        }
    </style>
<main class="container">
        <h1>Asistencia a parciales</h1>
        <div class="toolbar">
            <label>Parcial:
                <select id="partialFilter" class="select" style="width:auto">
                    <option value="1">1° Parcial</option>
                    <option value="2">2° Parcial</option>
                </select>
            </label>
            <label>Recuperatorio:
                <select id="attemptFilter" class="select" style="width:auto">
                    <option value="PA">Parcial</option>
                    <option value="1R">1° Recu</option>
                    <option value="2R">2° Recu</option>
                </select>
            </label>
            <div class="spacer"></div>
            <button id="btnDownloadXls" class="btn">Descargar Excel</button>
            <button id="btnDownloadPdf" class="btn">Descargar PDF</button>
        </div>
        <div id="content"></div>
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