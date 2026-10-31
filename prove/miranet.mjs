// Biliardo online: la mira in diretta (31-10-2026). A gira la stecca col dito e poi la tira indietro e tira; B intanto guarda:
// deve vedere la stecca girare (angolo che cambia piu' volte), tirarsi indietro (forza che sale), il colpo, poi il tiro vero.
// uso: node prove/cdp2.mjs . prove/miranet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sfida = `(async () => { cq.x = CQ_W - 2 - 10.5; cq.y = 9.6; await new Promise(r => setTimeout(r, 600)); const B = document.getElementById('tvB_bi'); if (!B || B.hidden) return 'pulsante non visibile'; B.click(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzCarB')); if (!b) return 'niente sfida'; b.click(); await new Promise(r => setTimeout(r, 300)); const z = document.querySelector('#tvModal [data-k=b0]'); if (z) z.click(); return 'sfidato'; })()`;
const accetta = `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; m.querySelector('[data-k=ok]').click(); return 'accettato'; })()`;
const guarda = `(() => { const T = BI.T; if (!T) return 'B: nessuna partita'; window.__s = { a: new Set(), pmax: 0, st: 0, seen0: T.seen, n: 0, last: null };
  clearInterval(window.__g); window.__g = setInterval(() => { const T = BI.T; if (!T) return; const S = window.__s; if (T.rem && T.rem.sid === T.S.sid) { S.n++; S.a.add(T.ra.toFixed(2)); S.pmax = Math.max(S.pmax, T.rp); S.last = T.ra; } if (T.rst) S.st = 1; }, 40);
  return 'B guarda (tocca a ' + T.S.tu + ', io sono ' + T.me + ')'; })()`;
const tira = `(async () => { const T = BI.T, w = ms => new Promise(r => setTimeout(r, ms)); if (!T || T.S.tu !== T.me) return 'A: non tocca a me';
  const cv = T.cv, r = cv.getBoundingClientRect(), ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, pointerType: 'touch' }));
  const scr = (x, y) => [T.ox + x * T.k, T.oy + y * T.k], c = T.S.b.find(b => b[0] === 0);
  // giro la stecca: dito sul panno a destra della bianca, poi un arco attorno
  ev('pointerdown', ...scr(c[1] + 15, c[2])); for (let i = 1; i <= 30; i++) { const a = i * 0.025; ev('pointermove', ...scr(c[1] + 15 * Math.cos(a), c[2] + 15 * Math.sin(a))); await w(40); } ev('pointerup', ...scr(c[1] + 15 * Math.cos(0.75), c[2] + 15 * Math.sin(0.75)));
  const ang = Math.atan2(T.aim.dy, T.aim.dx); await w(400);
  // prendo la stecca e la tiro indietro piano, poi lascio
  const d = T.aim, gx = c[1] - d.dx * 8, gy = c[2] - d.dy * 8; ev('pointerdown', ...scr(gx, gy));
  for (let i = 1; i <= 25; i++) { ev('pointermove', ...scr(gx - d.dx * i * 0.4, gy - d.dy * i * 0.4)); await w(40); }
  await w(300); ev('pointerup', ...scr(gx - d.dx * 10, gy - d.dy * 10)); await w(100);
  return 'A: stecca girata a ' + ang.toFixed(2) + ', tiro mandato' + (T.strike || T.wait || T.anim ? '' : ' (?)'); })()`;
const esito = `(async () => { await new Promise(r => setTimeout(r, 300)); clearInterval(window.__g); const T = BI.T, S = window.__s; if (!T || !S) return 'B: niente';
  return 'B ha visto: ' + S.n + ' campioni, ' + S.a.size + ' angoli diversi, ultimo ' + (S.last == null ? '-' : S.last.toFixed(2)) + ', forza massima ' + S.pmax.toFixed(2) + ', colpo ' + (S.st ? 'si' : 'no') + ', tiro arrivato ' + (T.seen !== S.seen0 ? 'si' : 'no') + ', ora tocca a ' + T.S.tu; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, sfida, 2500], [1, accetta, 3000],
  [1, guarda, 0], [0, tira, 0], [1, esito, 6000], [1, esito, 0],
  [0, errs, 0], [1, errs, 0],
  [0, `(async () => { BI.close(); await new Promise(r => setTimeout(r, 1500)); return 'A chiude'; })()`, 0],
];
