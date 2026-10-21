// Evasione passo 4: la spia (soffiata, attesa, spia del computer, vittoria senza la spia). uso: node prove/cdp.mjs . prove/eva7.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  window.__T = []; const t0 = window.cqToast; window.cqToast = h => { __T.push(String(h).replace(/<[^>]+>/g, '')); t0(h); };
  store.settings.myName = 'zzProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('evHelpN', '9'); } catch {}
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=evasione]').click(); await w(2500);
  const sb = document.querySelector('#tkBody input[name=spy][value="1"]'); out.push('impostazione spia: ' + !!sb); if (sb) { sb.checked = true; sb.dispatchEvent(new Event('change', { bubbles: true })); } await w(200);
  $('#lbGo').click(); await w(3500);
  const G = cq.g, M = CQ_MAP, E = window.__ev, me = G.me; G.pre = 0;
  out.push('opzione letta: spia ' + G.opt.spy + ' · spie: ' + G.chars.filter(c => c.spy).map(c => c.name).join(','));
  const last = (n = 1) => __T.slice(-n).join(' / ');
  const park = () => G.gd.forEach((g, i) => { g.x = 108 + 56 + i; g.y = 59.5; g.st = 'pat'; g.path = []; g.wait = 1e9; g.sus = 0; });
  // io la spia
  for (const c of G.chars) { c.spy = 0; c.spT = 0; } me.spy = 1; park(); G.time = 60; G.pc = 60; G.psL = []; G.camL = []; await w(300);
  const k = M.pcells.find(q => q !== me.cell); G.tun[k] = 0.5;
  cq.x = 49.5; cq.y = 40.5; const g = G.gd.find(o => !o.post); g.x = 50.5; g.y = 41.5; await w(200);
  let a = E.action(G, me); out.push('vicino a una guardia: ' + (a && a.t)); G.M.act(G); await w(200);
  out.push('soffiata: perquisizione ' + (G.ps ? 'cella ' + M.cells[G.ps.k].n + ' tra ' + Math.round(G.ps.t - G.time) + ' s' : 'no') + ' · ' + last(2) + ' · fumetto: ' + (g.bub && g.bub.t));
  a = E.action(G, me); out.push('subito dopo: ' + (a && a.t));
  // la spia del computer fa da sola
  me.spy = 0; const bs = G.chars.find(c => c.bot); bs.spy = 1; bs.spT = 0; G.ps = null; G.st[0] = ['cu', 'le']; G.tun[k] = 0; await w(600);
  out.push('spia del computer: soffiate ' + (bs.snN || 0) + ' · guardie che vanno all\'orto: ' + G.gd.filter(o => o.st === 'srch' && o.sp[0] && o.sp[0].h === 0).length);
  // vittoria della squadra senza la spia
  for (const c of G.chars) if (!c.spy) E.escapeC(G, c, 'tun', 30.5, 2.5, { nf: 1 }); await w(800);
  out.push('fine: ' + $('#tkTitle').textContent + ' · ' + $('#tkBody').textContent.slice(0, 260));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return out.join('\n');
})()
