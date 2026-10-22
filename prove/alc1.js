// Duello degli alchimisti, passo 1: torre (tutto raggiungibile, voragine chiusa), disegno, computer che gira, fine della prova.
// uso: node prove/cdp.mjs . prove/alc1.js [foto.png]   (la foto: la torre in partita + in basso tutti i personaggi col cappello a punta)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  const card = document.querySelector('#tkBody [data-g=alchimisti]'); if (!card) return 'manca la carta del gioco';
  card.click(); await w(2500);
  out.push('impostazioni: ' + ($('#tkBody').textContent.includes('Come si gioca') ? 'ok' : 'MANCANO'));
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g; if (!G || G.mode !== 'alchimisti') return out.concat('partita non partita').join('\n');
  const A = window.__alc;
  // ---- tutto raggiungibile dal mio angolo, voragine e muri chiusi ----
  const Wd = CQ_W, Hd = CQ_H, seen = new Uint8Array(Wd * Hd), q = [[6, 6]]; seen[6 * Wd + 6] = 1;
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < Wd && ny < Hd && cqCellFree(nx, ny) && !seen[ny * Wd + nx]) { seen[ny * Wd + nx] = 1; q.push([nx, ny]); } } }
  let n = 0; const isl = [];
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (cqCellFree(x, y)) { n++; if (!seen[y * Wd + x]) isl.push(x + ',' + y); }
  out.push('caselle libere ' + n + (isl.length ? ' | NON RAGGIUNGIBILI: ' + isl.join(' ') : ' | tutto raggiungibile'));
  out.push('angolo davanti raggiungibile: ' + (seen[14 * Wd + 14] ? 'si' : 'NO') + ' | calderoni: ' + A.KETTLE.map(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * Wd + x + dx]) ? 'ok' : 'NO').join(' '));
  let pitOpen = 0; for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) if (A.isPit(x, y) && cqCellFree(x, y)) pitOpen++;
  out.push('voragine: ' + CQ_PROPS.filter(p => p[0] === 'pit').length + ' caselle' + (pitOpen ? ', APERTE ' + pitOpen : ', chiusa'));
  out.push('oggetti: ' + Object.entries(CQ_PROPS.reduce((m, p) => (m[p[0]] = (m[p[0]] || 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(', '));
  { const p = cqPath(6.5, 6.5, 14.5, 14.5); out.push('da un angolo all\'altro a piedi: ' + (p.length ? Math.round(p.reduce((s, c, i) => s + (i ? Math.hypot(c[0] - p[i - 1][0], c[1] - p[i - 1][1]) : 0), 0) / CQ_SPEED * 10) / 10 + ' s' : 'NESSUNA STRADA')); }
  // ---- disegno ----
  { const t0 = performance.now(); cq.bg = null; cqBuildBg(); out.push('mappa pronta in ' + Math.round(performance.now() - t0) + ' ms, tessere ' + cq.bg.tiles.length); }
  { let t = 0; for (let i = 0; i < 20; i++) { const t0 = performance.now(); cqDraw(); t += performance.now() - t0; } out.push('un fotogramma: ' + (t / 20).toFixed(1) + ' ms'); }
  // ---- il computer gira; la prova finisce allo scadere ----
  const bot = G.chars.find(c => c.bot), b0 = [bot.x, bot.y];
  cq.on = false; cancelAnimationFrame(cq.raf);
  for (let i = 0; i < 200; i++) cqModeTick(0.05);
  out.push('computer: si e\' mosso di ' + Math.hypot(bot.x - b0[0], bot.y - b0[1]).toFixed(1) + ' caselle, dentro la torre: ' + (Math.hypot(bot.x - A.C, bot.y - A.C) < A.RAD ? 'si' : 'NO'));
  out.push('barra: ' + $('#cqModeBar').textContent);
  G.left = 0.01; cqModeTick(0.05);
  out.push('fine: ' + G.phase + ' | ' + $('#tkTitle').textContent);
  cqCloseTask(); G.phase = 'play'; G.left = 99;
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  // ---- foto: io vicino alla voragine, l'altro poco lontano; sotto, tutti i personaggi col cappello ----
  cq.x = 7.6; cq.y = 8.4; bot.x = bot.tx = 12.5; bot.y = bot.ty = 7.6; bot.path = [];
  cq.on = true; cqDraw();
  const skins = Object.keys(CQ_SKINS), cv = document.createElement('canvas'), TW = 44; cv.width = skins.length * 30 * 2; cv.height = 150 * 2;
  cv.style.cssText = 'position:fixed;left:0;bottom:0;width:' + skins.length * 30 + 'px;height:150px;background:#2a2436;z-index:99999';
  const g = cv.getContext('2d'); g.scale(2, 2);
  skins.forEach((s, i) => A.wizard(g, 16 + i * 29, 140, TW * 0.62, { skin: s, col: CQ_SKINS[s].col || '#d0402a', hat: 'nessuno' }, 0, i % 2 ? -1 : 1, i % 2, ['#d0402a', '#3ab0e0', null, '#e0c030']));
  document.body.appendChild(cv);
  return out.join('\n');
})()
