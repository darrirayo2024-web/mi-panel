import { S, save, ic, esc, uid, money, today, ymKey, sheet, closeSheet, toast } from '../core.js';

const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
const ui = { ym: ymKey(new Date()), type: 'gasto' };
const CATI = { Comida: '🍽️', Transporte: '🚌', Hogar: '🏠', Ocio: '🎮', Salud: '💊', Compras: '🛍️', Servicios: '💡', Otros: '📦', Sueldo: '💼', Extra: '✨', Regalo: '🎁' };
const CAT = { gasto: ['Comida', 'Transporte', 'Hogar', 'Ocio', 'Salud', 'Compras', 'Servicios', 'Otros'], ingreso: ['Sueldo', 'Extra', 'Regalo', 'Otros'] };
const COL = ['#E8365F', '#F0A23A', '#3DBE8B', '#4C9BE8', '#8C6AE8', '#E86AB8', '#5BC7C7', '#A0A0B8'];

function monthTx(ym) { return S.tx.filter(t => t.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)); }
function sumTx(l) { let i = 0, g = 0; l.forEach(t => { t.type === 'ingreso' ? i += t.amt : g += t.amt; }); return { i, g, b: i - g }; }
function shiftM(d) { const [y, m] = ui.ym.split('-').map(Number); ui.ym = ymKey(new Date(y, m - 1 + d, 1)); rerender(); }

function txSheetHtml() {
  return `<div class="sh-h"><b>Nuevo movimiento</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
  <div class="seg"><button data-a="txType" data-t="gasto" class="${ui.type === 'gasto' ? 'on' : ''}">Gasto</button><button data-a="txType" data-t="ingreso" class="${ui.type === 'ingreso' ? 'on' : ''}">Ingreso</button></div>
  <label class="fld">Monto<input id="xAmt" type="number" inputmode="decimal" step="0.01" placeholder="0.00"></label>
  <div class="row2"><label class="fld">Categoría<select id="xCat">${CAT[ui.type].map(c => `<option>${c}</option>`).join('')}</select></label><label class="fld">Fecha<input id="xDate" type="date" value="${today()}"></label></div>
  <label class="fld">Nota (opcional)<input id="xNote" maxlength="60" placeholder="Ej. Almuerzo con amigos"></label>
  <button class="btn ac wide" data-a="txSave">Guardar</button>`;
}

export default {
  id: 'dinero', label: 'Dinero', tabIcon: 'dollar', title: () => 'Dinero',
  render() {
    const l = monthTx(ui.ym), s = sumTx(l);
    const [y, m] = ui.ym.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    const cats = {}; l.filter(t => t.type === 'gasto').forEach(t => cats[t.cat] = (cats[t.cat] || 0) + t.amt);
    const arr = Object.entries(cats).sort((a, b) => b[1] - a[1]), mx = arr.length ? arr[0][1] : 1;
    const bp = S.budget > 0 ? s.g / S.budget : 0, bc = bp >= 1 ? 'var(--bad)' : bp >= .8 ? 'var(--warn)' : 'var(--ok)';
    let last = '', rows = '';
    l.forEach(t => {
      if (t.date !== last) { last = t.date; rows += `<div class="day">${new Date(t.date + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}</div>`; }
      rows += `<div class="tx-r"><span class="cat">${CATI[t.cat] || '📦'}</span><div class="d"><b>${esc(t.cat)}</b>${t.note ? `<span class="mu">${esc(t.note)}</span>` : ''}</div><b class="${t.type === 'ingreso' ? 'pos' : ''}">${t.type === 'ingreso' ? '+' : '−'}${money(t.amt)}</b><button class="ib" data-a="txDel" data-id="${t.id}" aria-label="Eliminar">${ic('trash', 17)}</button></div>`;
    });
    return `<button class="btn ac wide" style="margin-top:0" data-a="txSheet">${ic('plus', 18)} Registrar movimiento</button>
    <div class="mon" style="margin-top:14px"><button class="ib" data-a="mPrev" aria-label="Mes anterior">${ic('left')}</button><b>${label}</b><button class="ib" data-a="mNext" aria-label="Mes siguiente">${ic('right')}</button></div>
    <div class="sum"><div class="card full"><small>Balance</small><b class="${s.b < 0 ? 'neg' : ''}">${money(s.b)}</b></div>
      <div class="card"><small>Ingresos</small><b class="pos">${money(s.i)}</b></div><div class="card"><small>Gastos</small><b>${money(s.g)}</b></div></div>
    ${S.budget > 0 ? `<div class="card bud"><small>Presupuesto del mes: ${money(S.budget)}</small><div><i style="width:${Math.min(100, bp * 100)}%;background:${bc}"></i></div><small>${bp >= 1 ? 'Te pasaste por ' + money(s.g - S.budget) : 'Te quedan ' + money(S.budget - s.g)}</small></div>` : ''}
    ${arr.length ? `<h2>En qué gastas</h2><div class="card bars">${arr.map(([c, v], i) => `<div class="bar"><span>${CATI[c] || ''} ${c}</span><div><i style="width:${v / mx * 100}%;background:${COL[i % COL.length]}"></i></div><b>${money(v)}</b></div>`).join('')}</div>` : ''}
    <h2>Movimientos</h2>${rows || `<div class="empty"><b>Sin movimientos este mes</b>Registra tus ingresos y gastos para ver el resumen.</div>`}`;
  },
  actions: {
    mPrev: () => shiftM(-1), mNext: () => shiftM(1),
    txSheet: () => { ui.type = 'gasto'; sheet(txSheetHtml()); },
    txType: b => { ui.type = b.dataset.t; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.t === ui.type)); document.getElementById('xCat').innerHTML = CAT[ui.type].map(c => `<option>${c}</option>`).join(''); },
    txSave: () => {
      const amt = parseFloat(String(document.getElementById('xAmt').value).replace(',', '.'));
      if (!(amt > 0)) { toast('Escribe un monto mayor a 0'); return; }
      const date = document.getElementById('xDate').value || today();
      S.tx.push({ id: uid(), type: ui.type, amt, cat: document.getElementById('xCat').value, date, note: document.getElementById('xNote').value.trim() });
      ui.ym = date.slice(0, 7); save(); closeSheet(); rerender();
      toast('Movimiento guardado');
    },
    txDel: b => { S.tx = S.tx.filter(x => x.id !== b.dataset.id); save(); rerender(); }
  }
};
