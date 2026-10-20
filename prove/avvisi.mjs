// avvisi: l'amico si iscrive (🔔), l'host apre un set -> all'amico arriva la campanella; il set si chiude -> sparisce
const name = n => `(async () => {
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = '${n}'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); await new Promise(r => setTimeout(r, 1500)); return 'pulsante: ' + ($('#netBell') ? $('#netBell').textContent : 'MANCA');
})()`;
const notif = `(async () => { const reg = await navigator.serviceWorker.ready; const n = await reg.getNotifications(); return 'notifiche: ' + (n.map(x => x.title + ' / ' + x.body).join(' ; ') || 'nessuna'); })()`;
export const plain0 = 1;   // la pagina 0 (amico) nel profilo normale
export default [
  [1, name('zzHost'), 0], [0, name('zzAmico'), 0],
  [0, `(async () => { await pushToggle(); return 'amico: ' + __T.slice(-1)[0] + ' | ' + $('#netBell').textContent + ' | id ' + store.settings.pushId; })()`, 1000],
  [1, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'host: set aperto'; })()`, 12000],
  [0, notif, 0],
  [1, `(() => { cqNetLeave(); return 'host: set chiuso'; })()`, 15000],
  [0, notif, 0],
  [0, `(async () => { await pushToggle(); return 'amico: ' + __T.slice(-1)[0]; })()`, 1000],
];
