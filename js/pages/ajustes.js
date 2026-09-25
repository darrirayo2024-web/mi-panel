import { S, save, DEF, clone, applyTheme, toast, confirmSheet, ic, isOnline } from '../core.js';
import { removeTrack } from '../audio.js';
import { refreshHolidays } from './calendario.js';

const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
const backup = () => ({ v: 2, name: S.name, theme: S.theme, currency: S.currency, budget: S.budget, country: S.country, tasks: S.tasks, habits: S.habits, notes: S.notes, tx: S.tx, events: S.events });

export default {
  id: 'ajustes', label: 'Ajustes', tabIcon: 'gear', title: () => 'Ajustes',
  render() {
    return `<h2 style="margin-top:0">Tu perfil</h2>
    <label class="fld">Tu nombre<input id="sName" value="${S.name}" maxlength="30"></label>
    <label class="fld">Tema<select id="sTheme"><option value="auto">Automático</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
    <div class="row2"><label class="fld">Moneda<input id="sCur" value="${S.currency}" maxlength="4"></label><label class="fld">Presupuesto mensual<input id="sBud" type="number" inputmode="decimal" value="${S.budget || ''}" placeholder="0"></label></div>

    <h2>Calendario</h2>
    <p class="mu" style="font-size:13.5px;margin:0 0 8px">Los feriados se guardan en tu teléfono y se usan sin internet. Actualízalos de vez en cuando si tienes conexión.</p>
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <span style="display:flex;align-items:center;gap:8px;font-weight:600">${ic(isOnline() ? 'wifi' : 'wifioff', 18)} ${isOnline() ? 'Con conexión' : 'Sin conexión'}</span>
      <button class="btn sm" data-a="holUpdate">${ic('refresh', 16)} Actualizar feriados</button>
    </div>

    <h2>Respaldo de datos</h2>
    <p class="mu" style="font-size:13.5px;margin-bottom:8px">Copia este texto y guárdalo. Con él recuperas tareas, hábitos, notas, dinero y eventos si cambias de dispositivo. Las canciones no se incluyen aquí, porque pesan demasiado para un texto.</p>
    <textarea id="bk" rows="3"></textarea>
    <div class="row2" style="margin-top:8px"><button class="btn" data-a="bkCopy">Copiar respaldo</button><button class="btn" data-a="bkImport">Importar pegado</button></div>

    <h2>Zona de riesgo</h2>
    <button class="btn bad wide" data-a="wipe">Borrar todos los datos</button>
    <p class="mu" style="font-size:12.5px;margin-top:16px">Mi Panel — hecho para ti, sin cuentas ni anuncios.</p>`;
  },
  mount() {
    const t = document.getElementById('sTheme'); if (t) t.value = S.theme;
    const bk = document.getElementById('bk'); if (bk) bk.value = JSON.stringify(backup());
  },
  actions: {
    holUpdate: () => refreshHolidays(true),
    bkCopy: () => {
      const t = document.getElementById('bk'); t.value = JSON.stringify(backup()); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(() => toast('Respaldo copiado'), () => toast(ok ? 'Respaldo copiado' : 'Selecciona el texto y cópialo'));
      else toast(ok ? 'Respaldo copiado' : 'Selecciona el texto y cópialo');
    },
    bkImport: () => {
      try {
        const o = JSON.parse(document.getElementById('bk').value);
        ['tasks', 'habits', 'notes', 'tx', 'events'].forEach(k => { if (Array.isArray(o[k])) S[k] = o[k]; });
        ['name', 'theme', 'currency', 'country'].forEach(k => { if (typeof o[k] === 'string') S[k] = o[k]; });
        if (typeof o.budget === 'number') S.budget = o.budget;
        save(); applyTheme(); rerender(); toast('Respaldo importado');
      } catch (e) { toast('El texto no es un respaldo válido'); }
    },
    wipe: () => confirmSheet('Esto borra tareas, hábitos, notas, movimientos, eventos y canciones. No se puede deshacer.', 'Borrar todo', () => {
      S.tracks.slice().forEach(t => removeTrack(t.id));
      const name = S.name;
      Object.assign(S, clone(DEF));
      S.name = name;
      save(); applyTheme();
      document.dispatchEvent(new CustomEvent('app:closePlayer'));
      rerender(); toast('Datos borrados');
    })
  },
  inputs: {
    sName: el => { S.name = el.value.trim() || 'Isaias'; save(); },
    sCur: el => { S.currency = el.value.trim() || 'Q'; save(); },
    sBud: el => { S.budget = Math.max(0, parseFloat(el.value) || 0); save(); }
  },
  changes: {
    sTheme: el => { S.theme = el.value; applyTheme(); save(); }
  }
};
