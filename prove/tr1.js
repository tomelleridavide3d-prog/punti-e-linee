// La casa delle trappole, passo 1: villa (tutto raggiungibile, nascondigli raggiungibili), disegno, partita finta (trova il diamante e torna al portone).
// uso: node prove/cdp.mjs . prove/tr1.js [foto.png]   (window.__NT = 1: di notte; window.__SHOT = 'map': la foto e' tutta la villa)
window.__SHOT = window.__SHOT || 'map';
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=trappole]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + ($('#tkBody').textContent.includes('Ora del giorno') ? 'ok' : 'MANCANO'));
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: window.__NT ? 1 : 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'trappole') return out.concat('partita non partita').join('\n');
  // ---- tutto raggiungibile dall'ingresso ----
  const Wd = CQ_W, Hd = CQ_H, seen = new Uint8Array(Wd * Hd), q = [[16, 28]]; seen[28 * Wd + 16] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < Wd && ny < Hd && cqCellFree(nx, ny) && !seen[ny * Wd + nx]) { seen[ny * Wd + nx] = 1; q.push([nx, ny]); } } }
  let n = 0; const isl = [];
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (cqCellFree(x, y)) { n++; if (!seen[y * Wd + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + n + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.join(' ') : ' | tutto raggiungibile'));
  const sp = CQ_PROPS.filter(p => p[3] && p[3].h), badS = [];
  for (const [t, x, y, o] of sp) { const cells = t === 'bed' ? [[x, y], [x - 1, y], [x, y - 1], [x - 1, y - 1]] : t === 'desk' ? [[x, y], [x - 1, y]] : [[x, y]]; if (!cells.some(([a, b]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(b + dy) * Wd + a + dx]))) badS.push(o.n + ' ' + x + ',' + y); }
  out.push('nascondigli ' + sp.length + (badS.length ? ' | IRRAGGIUNGIBILI: ' + badS.join(' | ') : ' | tutti raggiungibili'));
  // distanza a piedi dal portone alla stanza piu' lontana
  const far = {}; for (const r of CQ_ROOMS.filter(r => !r.door)) { const p = cqPath(16.5, 28.5, r.x + r.w / 2, r.y + r.h / 2); far[r.n] = p.length ? Math.round(p.reduce((s, c, i) => s + (i ? Math.hypot(c[0] - p[i - 1][0], c[1] - p[i - 1][1]) : 0), 0) / CQ_SPEED * 10) / 10 + ' s' : 'nessuna strada'; }
  out.push('a piedi dal portone: ' + Object.entries(far).map(([k, v]) => k + ' ' + v).join(', '));
  // ---- disegno della villa ----
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms, tessere ' + cq.bg.tiles.length); }
  out.push('barra: ' + $('#cqModeBar').textContent + ' | scritta: ' + $('#cqCount').textContent);
  // ---- partita finta: il diamante in un posto noto, apro un mobile sbagliato e poi quello giusto, torno al portone ----
  cq.on = false; cancelAnimationFrame(cq.raf); const toasts = []; window.cqToast = t => toasts.push(t);
  const SP = CQ_PROPS.filter(p => p[3] && p[3].h), di = SP.findIndex(p => p[3].n === 'Armadio'), wr = SP.findIndex(p => p[3].n === 'Cassapanca');
  G.dia = di;
  for (let i = 0; i < 70; i++) cqModeTick(0.05);   // i 3 s di "pronti"
  const go = (x, y) => { cq.x = x; cq.y = y; };
  const open = (k) => { const s = SP[k]; go(s[1] + 0.5, s[2] + 1.6); const b = G.M.btn(G); G.M.act(G); for (let i = 0; i < 50; i++) cqModeTick(0.05); return b ? b.t : 'nessun pulsante'; };
  out.push('mobile sbagliato: ' + open(wr) + ' -> ' + toasts.slice(-1)[0]);
  out.push('mobile giusto: ' + open(di) + ' -> ' + (G.has ? 'diamante preso' : 'NIENTE'));
  go(16.8, 28.6); cqModeTick(0.05);
  out.push('fine: ' + (G.endInfo ? G.endInfo.t + ' — ' + G.endInfo.why.replace(/<[^>]+>/g, '') : 'NON FINITA'));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  // ---- foto: tutta la villa (la mappa pronta in un'immagine sola) oppure lo schermo in partita ----
  if (window.__SHOT === 'map') {
    const B = cq.bg, sc = 0.5, cv = document.createElement("canvas"); cv.width = B.bw * sc; cv.height = B.bh * sc; const g = cv.getContext('2d');
    g.fillStyle = '#1a1622'; g.fillRect(0, 0, cv.width, cv.height);
    for (const t of B.tiles) g.drawImage(t.c, t.x * sc, t.y * sc, t.w * sc, t.h * sc);
    document.body.innerHTML = ''; document.body.style.margin = 0; document.body.style.background = '#1a1622'; cv.style.width = '100vw'; document.body.appendChild(cv);
  }
  return out.join('\n');
})()
