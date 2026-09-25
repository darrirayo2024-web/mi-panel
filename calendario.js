import { S, save, ic, esc, uid, ymd, today, pad, sheet, closeSheet, confirmSheet, toast, isOnline } from '../core.js';

const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const ui = { view: 'month', y: new Date().getFullYear(), m: new Date().getMonth(), day: today() };

// ---------- feriados fijos de Guatemala, de respaldo si no hay internet ----------
const FALLBACK_GT = [
  ['01-01', 'Año Nuevo'], ['05-01', 'Día del Trabajo'], ['09-15', 'Día de la Independencia'],
  ['10-20', 'Día de la Revolución'], ['11-01', 'Día de Todos los Santos'],
  ['12-24', 'Nochebuena'], ['12-25', 'Navidad'], ['12-31', 'Fin de Año']
];
function fallbackHolidays(year) { return FALLBACK_GT.map(([md, name]) => ({ date: year + '-' + md, name, fallback: true })); }

async function fetchHolidays(year) {
  if (!isOnline()) return null;
  try {
    const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${S.country || 'GT'}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.map(h => ({ date: h.date, name: h.localName || h.name }));
  } catch (e) { return null; }
}
async function ensureHolidays(year) {
  if (S.holidaysCache[year]) return S.holidaysCache[year];
  const online = await fetchHolidays(year);
  S.holidaysCache[year] = online || fallbackHolidays(year);
  save();
  return S.holidaysCache[year];
}
export async function refreshHolidays(showToast) {
  const y = new Date().getFullYear();
  const a = await fetchHolidays(y), b = await fetchHolidays(y + 1);
  if (a) { S.holidaysCache[y] = a; }
  if (b) { S.holidaysCache[y + 1] = b; }
  save();
  if (showToast) toast(a || b ? 'Feriados actualizados' : 'Sin conexión: se quedaron los que ya tenías');
  rerender();
}
function holidayOn(ds) {
  const y = ds.slice(0, 4);
  const l = S.holidaysCache[y] || fallbackHolidays(y);
  return l.find(h => h.date === ds) || null;
}

// ---------- eventos propios (con repetición) ----------
function occursOn(ev, ds) {
  if (ds < ev.date) return false;
  const a = ev.date.split('-').map(Number), b = ds.split('-').map(Number);
  switch (ev.repeat) {
    case 'daily': return true;
    case 'weekly': return new Date(ev.date + 'T00:00:00').getDay() === new Date(ds + 'T00:00:00').getDay();
    case 'monthly': return a[2] === b[2];
    case 'yearly': return a[1] === b[1] && a[2] === b[2];
    default: return ev.date === ds;
  }
}
function eventsOn(ds) { return S.events.filter(e => occursOn(e, ds)); }
function dayInfo(ds) {
  const tasks = S.tasks.filter(t => t.due === ds);
  const habits = S.habits.filter(h => h.days.includes(ds));
  const tx = S.tx.filter(t => t.date === ds);
  const notes = S.notes.filter(n => ymd(new Date(n.upd)) === ds);
  const events = eventsOn(ds);
  const holiday = holidayOn(ds);
  return { tasks, habits, tx, notes, events, holiday };
}

// ---------- vista de mes ----------
function monthGrid(y, m) {
  const first = new Date(y, m, 1), startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function rMonth() {
  const cells = monthGrid(ui.y, ui.m);
  const t = today();
  const html = cells.map(d => {
    if (!d) return `<span class="cd off"></span>`;
    const ds = ui.y + '-' + pad(ui.m + 1) + '-' + pad(d);
    const info = dayInfo(ds);
    const dots = [];
    if (info.tasks.length) dots.push('var(--bad)');
    if (info.habits.length) dots.push('var(--ok)');
    if (info.tx.length) dots.push('var(--blue)');
    if (info.events.length) dots.push('var(--ac)');
    return `<button class="cd ${ds === t ? 'td' : ''} ${info.holiday ? 'hol' : ''}" data-a="calDay" data-d="${ds}">
      <span class="n">${d}</span>
      ${info.holiday ? `<span class="hs">${ic('star', 9, true)}</span>` : ''}
      <span class="dots">${dots.slice(0, 3).map(c => `<i style="background:${c}"></i>`).join('')}</span>
    </button>`;
  }).join('');
  return `<div class="cal-h"><button class="ib" data-a="mPrevM" aria-label="Mes anterior">${ic('left')}</button>
    <button class="cal-title" data-a="calYear">${MESES[ui.m]} ${ui.y}</button>
    <button class="ib" data-a="mNextM" aria-label="Mes siguiente">${ic('right')}</button></div>
    <div class="cal-dow">${DIAS.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="cal-grid">${html}</div>
    <button class="btn wide" data-a="calToday">Ir a hoy</button>`;
}

// ---------- vista de año ----------
function miniMonth(y, m) {
  const cells = monthGrid(y, m), t = today();
  return `<button class="mini-m" data-a="calOpenMonth" data-y="${y}" data-m="${m}">
    <b>${MESES[m]}</b>
    <span class="mini-dow">${DIAS.map(d => `<i>${d}</i>`).join('')}</span>
    <span class="mini-grid">${cells.map(d => {
      if (!d) return '<i></i>';
      const ds = y + '-' + pad(m + 1) + '-' + pad(d);
      const has = S.tasks.some(x => x.due === ds) || S.habits.some(h => h.days.includes(ds)) || eventsOn(ds).length || holidayOn(ds);
      return `<i class="${ds === t ? 'td' : ''} ${has ? 'has' : ''}">${d}</i>`;
    }).join('')}</span></button>`;
}
function rYear() {
  return `<div class="cal-h"><button class="ib" data-a="yPrev" aria-label="Año anterior">${ic('left')}</button>
    <b>${ui.y}</b><button class="ib" data-a="yNext" aria-label="Año siguiente">${ic('right')}</button></div>
    <div class="mini-year">${Array.from({ length: 12 }, (_, m) => miniMonth(ui.y, m)).join('')}</div>`;
}

// ---------- vista de día ----------
function rDay() {
  const ds = ui.day, info = dayInfo(ds);
  const d = new Date(ds + 'T00:00:00');
  const rows = [];
  if (info.holiday) rows.push(`<div class="dcard hol"><b>${ic('star', 16, true)} ${esc(info.holiday.name)}</b><small>Día feriado en Guatemala${info.holiday.fallback ? '' : ''}</small></div>`);
  info.events.forEach(e => rows.push(`<div class="dcard" style="border-left:4px solid ${e.color}"><b>${e.time ? e.time + ' · ' : ''}${esc(e.title)}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}<button class="ib" data-a="evDel" data-id="${e.id}" aria-label="Eliminar">${ic('trash', 16)}</button></div>`));
  info.tasks.forEach(t => rows.push(`<div class="dcard"><b>${ic('checkc', 15)} ${esc(t.text)}</b><small>Tarea · prioridad ${t.pri}</small></div>`));
  if (info.habits.length) rows.push(`<div class="dcard"><b>${ic('target', 15)} Hábitos cumplidos</b><small>${info.habits.map(h => esc(h.name)).join(', ')}</small></div>`);
  info.tx.forEach(t => rows.push(`<div class="dcard"><b>${ic('dollar', 15)} ${t.type === 'ingreso' ? '+' : '−'}${S.currency} ${t.amt.toFixed(2)} · ${esc(t.cat)}</b>${t.note ? `<small>${esc(t.note)}</small>` : ''}</div>`));
  info.notes.forEach(n => rows.push(`<div class="dcard"><b>${ic('note', 15)} ${esc(n.title || 'Nota sin título')}</b></div>`));
  return `<div class="cal-h"><button class="ib" data-a="calBack" aria-label="Volver">${ic('left')}</button>
    <b style="text-transform:capitalize">${d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}</b><span style="width:40px"></span></div>
    <button class="btn ac wide" style="margin-top:2px" data-a="evNew">${ic('plus', 18)} Nuevo evento este día</button>
    <div class="dlist">${rows.length ? rows.join('') : `<div class="empty"><b>Nada para este día</b>Agrega un evento o revisa otra fecha.</div>`}</div>`;
}

function evSheetHtml() {
  return `<div class="sh-h"><b>Nuevo evento</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
  <label class="fld">Título<input id="evTitle" maxlength="60" placeholder="Ej. Cita, entrega, reunión"></label>
  <div class="row2"><label class="fld">Fecha<input id="evDate" type="date" value="${ui.day}"></label><label class="fld">Hora (opcional)<input id="evTime" type="time"></label></div>
  <label class="fld">Repetir<select id="evRep"><option value="none">No se repite</option><option value="daily">Cada día</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option><option value="yearly">Cada año</option></select></label>
  <label class="fld">Nota (opcional)<input id="evNote" maxlength="80"></label>
  <div class="colors">${['#E8365F', '#F0A23A', '#3DBE8B', '#4C9BE8', '#8C6AE8'].map(c => `<button class="${c === '#E8365F' ? 'on' : ''}" style="--c:${c}" data-a="evColor" data-c="${c}" aria-label="Color"></button>`).join('')}</div>
  <button class="btn ac wide" data-a="evSave">Guardar evento</button>`;
}
let pendColor = '#E8365F';

export function resetToMonth() { ui.view = 'month'; }

export default {
  id: 'calendario', label: 'Calendario', tabIcon: 'cal', title: () => 'Calendario',
  async render() {
    if (ui.view === 'month') { await ensureHolidays(ui.y); return rMonth(); }
    if (ui.view === 'year') { await Promise.all([ensureHolidays(ui.y)]); return rYear(); }
    return rDay();
  },
  actions: {
    mPrevM: () => { ui.m--; if (ui.m < 0) { ui.m = 11; ui.y--; } rerender(); },
    mNextM: () => { ui.m++; if (ui.m > 11) { ui.m = 0; ui.y++; } rerender(); },
    calYear: () => { ui.view = 'year'; rerender(); },
    yPrev: () => { ui.y--; rerender(); },
    yNext: () => { ui.y++; rerender(); },
    calOpenMonth: b => { ui.y = +b.dataset.y; ui.m = +b.dataset.m; ui.view = 'month'; rerender(); },
    calToday: () => { const d = new Date(); ui.y = d.getFullYear(); ui.m = d.getMonth(); ui.view = 'month'; rerender(); },
    calDay: b => { ui.day = b.dataset.d; ui.view = 'day'; rerender(); },
    calBack: () => { ui.view = 'month'; rerender(); },
    evNew: () => { pendColor = '#E8365F'; sheet(evSheetHtml()); },
    evColor: b => { pendColor = b.dataset.c; document.querySelectorAll('.colors button').forEach(x => x.classList.toggle('on', x.dataset.c === pendColor)); },
    evSave: () => {
      const title = document.getElementById('evTitle').value.trim();
      if (!title) { toast('Ponle un título al evento'); return; }
      S.events.push({ id: uid(), title, date: document.getElementById('evDate').value || ui.day, time: document.getElementById('evTime').value, repeat: document.getElementById('evRep').value, note: document.getElementById('evNote').value.trim(), color: pendColor });
      save(); closeSheet(); rerender();
    },
    evDel: b => confirmSheet('¿Eliminar este evento?', 'Eliminar', () => { S.events = S.events.filter(x => x.id !== b.dataset.id); save(); closeSheet(); rerender(); })
  }
};
