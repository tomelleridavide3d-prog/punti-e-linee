// Biliardo e air hockey online (2 pagine, Firebase vero): sfida, accetta, partita giocata da sole, stesso stato sui due telefoni, gol online, uscita.
// uso: node prove/cdp2.mjs . prove/tavnet.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore(); window.cqFast = 5;
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzCarA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro'; })()`;
const sfida = (id, x, y) => `(async () => { cq.x = CQ_W - 2 - ${x}; cq.y = ${y}; await new Promise(r => setTimeout(r, 600)); const B = document.getElementById('tvB_${id}'); if (!B || B.hidden) return 'pulsante non visibile'; B.click(); await new Promise(r => setTimeout(r, 300)); const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzCarB')); if (!b) return 'niente sfida'; b.click(); await new Promise(r => setTimeout(r, 300)); const z = document.querySelector('#tvModal [data-k=b0]'); if (z) z.click(); return 'sfidato'; })()`;
const accetta = `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; const t = m.innerText.replace(/\s+/g, ' '); m.querySelector('[data-k=ok]').click(); return t; })()`;
const autoBi = `(() => { clearInterval(window.__a); window.__a = setInterval(() => { const T = BI.T; if (!T || T.S.ph !== 'play' || T.me < 0 || T.S.tu !== T.me || T.anim || window.__w) return; window.__w = 1; setTimeout(() => { window.__w = 0; }, 1200); const sh = BI.aiTurn({ S: Object.assign({}, T.S, { ai: T.me }) }); if (sh) BI.act(sh); }, 300); return 'gioco da solo'; })()`;
const stBi = `(() => { const T = BI.T; if (!T) return 'nessuna partita, chiusa da: ' + String(window.cqCloseWhy || '').slice(0, 700); const S = T.S; return S.ph + ' v' + S.v + ' tocca ' + S.tu + ' palle ' + S.b.length + ' firma ' + S.b.map(b => b.join(':')).join('|').length + (S.ph === 'end' ? ' vince ' + S.win + ' ' + (S.why || '').replace(/<[^>]+>/g, '') : ''); })()`;
const autoAh = `(() => { clearInterval(window.__a); const T = AH.T, cv = document.querySelector('.tvRoot canvas'), r = cv.getBoundingClientRect(); const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, bubbles: true, pointerType: 'touch' }));
  const scr = (x, y) => { const k = T.k; return T.me === 1 ? [T.ox + (50 - x) * k, T.oy + (100 - y) * k] : [T.ox + x * k, T.oy + y * k]; };
  const home = T.me ? 12 : 88, mine = y => T.me ? y < 50 : y > 50; ev('pointerdown', ...scr(25, home));
  window.__a = setInterval(() => { const A = T.ah; let tx = A.px + (Math.random() - 0.5) * 6, ty = A.py + (T.me ? -3 : 3); if (!mine(A.py)) { tx = 25 + (A.px - 25) * 0.4; ty = home; } ev('pointermove', ...scr(tx, ty)); }, 40); return 'manopola da sola'; })()`;
const stAh = `(() => { const T = AH.T; if (!T) return 'nessuna partita, chiusa da: ' + String(window.cqCloseWhy || '').slice(0, 700); const S = T.S, A = T.ah; return S.ph + ' punteggio ' + S.sc.join('-') + ' disco n.' + S.rid + ' disco a ' + A.px.toFixed(0) + ',' + A.py.toFixed(0) + ' rep ' + (A.rep[1 - T.me] ? 'si' : 'no'); })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzCarA'), 0], [1, name('zzCarB'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 1500],
  [0, sfida('bi', 10.5, 9.6), 2500], [1, accetta, 3000],
  [0, stBi, 0], [1, stBi, 0],
  [0, autoBi, 0], [1, autoBi, 15000], [0, stBi, 0], [1, stBi, 15000],
  [0, stBi, 0], [1, stBi, 0],
  [0, `(async () => { clearInterval(window.__a); BI.close(); await new Promise(r => setTimeout(r, 2000)); return 'A chiude il biliardo'; })()`, 0],
  [1, `(async () => { clearInterval(window.__a); await new Promise(r => setTimeout(r, 500)); return 'B: ' + (BI.T ? 'ancora aperto' : 'chiuso'); })()`, 0],
  [0, sfida('ah', 3.8, 8.5), 2500], [1, accetta, 2500],
  [0, autoAh, 0], [1, autoAh, 30000],
  [0, stAh, 0], [1, stAh, 0],
  [0, `(async () => { clearInterval(window.__a); window.confirm = () => true; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 2000)); return 'A esce'; })()`, 0],
  [1, `(async () => { clearInterval(window.__a); return 'B: ' + (AH.T ? 'ancora aperto' : 'chiuso'); })()`, 0],
  [0, errs, 0], [1, errs, 0],
];
