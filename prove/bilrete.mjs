// biliardo online a velocita vera (24-10-2026): ogni tiro dell amico parte? la stecca NON deve tornare pronta mentre il tiro viaggia. uso: node prove/cdp2.mjs . prove/bilrete.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzBnA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sfida = `(async () => { cq.x = CQ_W - 2 - 10.5; cq.y = 9.6; await new Promise(r => setTimeout(r, 600)); const B = document.getElementById('tvB_bi'); if (!B || B.hidden) return 'pulsante non visibile'; B.click(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzBnB')); if (!b) return 'amico non in lista'; b.click(); await new Promise(r => setTimeout(r, 300)); const a = document.querySelector('#tvModal [data-k=b0]'); if (a) a.click(); return 'sfida mandata'; })()`;
const accetta = `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; m.querySelector('[data-k=ok]').click(); return 'accettata'; })()`;
// tiro con gesti veri (pointer sulla barra della forza) quando tocca a me; registro: tiro mandato -> animazione partita dopo quanti ms, stecca visibile nel frattempo
const auto = `(() => { clearInterval(window.__a); window.__log = []; window.__busy = 0;
  window.__a = setInterval(() => { const T = BI.T; if (!T || T.S.ph !== 'play' || T.me < 0 || T.S.tu !== T.me || T.anim || T.strike || window.__busy) return;
    window.__busy = 1; const sh = BI.aiTurn({ S: Object.assign({}, T.S, { ai: T.me }) }); T.aim = { dx: sh.dx, dy: sh.dy };
    const cv = T.cv, r = cv.getBoundingClientRect(), ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, pointerType: 'touch' }));
    const sid0 = T.S.sid, x = T.W - 30, y = T.H * 0.4; ev('pointerdown', x, y); ev('pointermove', x, y + 200 * sh.p); const t0 = performance.now(); ev('pointerup', x, y + 200 * sh.p);
    let stick = 0; const w = setInterval(() => { if (T.anim || T.S.sid !== sid0) { clearInterval(w); window.__log.push(Math.round(performance.now() - t0) + 'ms' + (stick ? ' (stecca di nuovo pronta per ' + stick + 'ms)' : '')); setTimeout(() => window.__busy = 0, 400); return; }
      if (!T.strike && T.S.tu === T.me && !T.anim && !(T.wait && T.wait.sid === T.S.sid)) stick += 20;
      if (performance.now() - t0 > 8000) { clearInterval(w); window.__log.push('PERSO: nessuna risposta in 8 s'); window.__busy = 0; } }, 20);
  }, 100); return 'gioco da solo'; })()`;
const st = who => `(() => { const T = BI.T; if (!T) return '${who}: nessuna partita'; const S = T.S; return '${who}: ' + S.ph + ' v' + S.v + ' tiri ' + S.sid + ' tocca ' + S.tu + ' (io ' + T.me + ') | miei tiri: ' + (window.__log || []).join(', '); })()`;
export default [
  [0, name('zzBnA'), 0], [1, name('zzBnB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, sfida, 2500], [1, accetta, 3000],
  [0, auto, 0], [1, auto, 45000],
  [0, st('banco'), 0], [1, st('amico'), 0],
  [0, `(async () => { clearInterval(window.__a); BI.close(); await new Promise(r => setTimeout(r, 1500)); return 'chiuso'; })()`, 0],
  [1, `(() => { clearInterval(window.__a); cqNetLeave(); return 'errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 300],
  [0, `(() => { cqNetLeave(); return 'errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200); })()`, 500],
];
