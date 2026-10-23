// Freccette online (3 pagine, Firebase vero): sfida dalla linea di tiro, l'amico accetta, partita intera con tiri simulati col dito, spettatore, rivincita, uscita.
// uso: node prove/cdp2.mjs . prove/frecnet.mjs
export const n = 3;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const auto = `(() => { clearInterval(window.__a); window.__a = setInterval(() => {
  const T = DA.T; if (!T || !T.S || T.S.ph !== 'play' || T.me < 0 || T.S.tu !== T.me || T.S.wait || T.anim || T.pend || T.aim || window.__busy) return;
  window.__busy = 1; const cv = document.querySelector('#daRoot canvas'), r = cv.getBoundingClientRect(), x = T.cx + (Math.random() - 0.5) * 0.3 * T.R, y = T.cy - 0.3 * T.R + 70;
  const ev = (t, yy) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + yy, pointerId: 1, bubbles: true }));
  ev('pointerdown', y); setTimeout(() => { ev('pointermove', y + 105); setTimeout(() => { ev('pointerup', y + 105); window.__busy = 0; }, 150); }, 250);
}, 300); return 'tiro da solo'; })()`;
const state = `(() => { const T = DA.T; if (!T) return 'nessuna partita aperta'; const S = T.S, e = document.getElementById('daEnd'); return (e ? 'FINE: ' + e.innerText.replace(/\s+/g, ' ').slice(0, 140) : 'in corso giro ' + S.r + ' tocca ' + S.tu) + ' | punti ' + S.th.map(a => a.reduce((x, y) => x + y, 0)).join('-') + ' | io ' + T.me + ' guardano ' + (T.watch || 0); })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 0], [2, name('zzCarC'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 0], [2, join, 2000],
  [0, `(async () => { cq.x = CQ_W - 4.5; cq.y = 5.4; await new Promise(r => setTimeout(r, 600)); document.getElementById('daHallB').click(); await new Promise(r => setTimeout(r, 300)); const m = document.getElementById('daModal'); const t = m.innerText.replace(/\s+/g, ' ').slice(0, 160); const b = [...m.querySelectorAll('button')].find(b => b.textContent.includes('zzCarB')); if (!b) return 'niente sfida a zzCarB: ' + t; b.click(); return 'sfidato: ' + t; })()`, 2500],
  [1, `(() => { const m = document.getElementById('daModal'); if (!m) return 'NESSUNA SFIDA ARRIVATA'; const t = m.innerText.replace(/\s+/g, ' '); m.querySelector('[data-k=ok]').click(); return 'sfida: ' + t; })()`, 3000],
  [0, state, 0], [1, state, 0],
  [2, `(async () => { cq.x = CQ_W - 4.5; cq.y = 5.4; await new Promise(r => setTimeout(r, 600)); document.getElementById('daHallB').click(); await new Promise(r => setTimeout(r, 300)); const m = document.getElementById('daModal'); const b = [...m.querySelectorAll('button')].find(b => b.textContent.includes('Guarda')); if (!b) return 'niente Guarda: ' + m.innerText.replace(/\s+/g, ' '); b.click(); await new Promise(r => setTimeout(r, 1500)); return 'guardo'; })()`, 0],
  [0, auto, 0], [1, auto, 45000],
  [0, state, 0], [1, state, 0], [2, state, 0],
  [0, `(async () => { document.querySelector('#daEnd [data-k=rv]').click(); await new Promise(r => setTimeout(r, 1500)); return 'A chiede la rivincita'; })()`, 0],
  [1, `(async () => { const b = document.querySelector('#daEnd [data-k=rv]'); const t = b ? b.textContent : 'nessun pulsante'; b && b.click(); await new Promise(r => setTimeout(r, 3000)); return 'B vedeva: ' + t; })()`, 0],
  [0, state, 0], [1, state, 0], [2, state, 0],
  [1, `(async () => { clearInterval(window.__a); window.confirm = () => true; document.getElementById('daX').click(); await new Promise(r => setTimeout(r, 2500)); return 'B esce'; })()`, 0],
  [0, state, 0], [2, state, 0],
  [0, errs, 0], [1, errs, 0], [2, errs, 0],
];
