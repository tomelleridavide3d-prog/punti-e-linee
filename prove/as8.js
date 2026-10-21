// Assedio: si colpisce chi sta nell'angolo di una torre? Un difensore sull'angolo della torre di sud-est (e uno sulla torre ovest del portone):
// (mira col dito: i sassi con fino a 0,8 caselle di scarto) 30 frecce da sotto (mira normale di un giocatore, con l'aiuto di mira) e 20 sassi della catapulta. Conta i colpi a segno.
// uso: node prove/cdp.mjs . prove/as8.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAsProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAsProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  try { localStorage.setItem('asHelpN', '9'); } catch {}
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.assedio = { n: 4, time: 240, lit: 'd', map: 'castello', fill: true }; saveStore();
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=assedio]').click(); await w(2500); $('#lbGo').click(); await w(2500);
  const G = cq.g, AS = window.__as; G.pre = 0; cq.on = false; cancelAnimationFrame(cq.raf);
  for (const c of G.chars) { c.bot = true; c.alive = false; }
  const shooter = G.chars.find(c => c.t === G.a0), def = G.chars.find(c => c.t !== G.a0);
  Object.assign(shooter, { alive: true, cls: 'a', q: 999, dn: 0, bot: false }); Object.assign(def, { alive: true, cls: 'g', dn: 0, sd: 0, bot: false });   // fermi: nessuno dei due e' guidato dal computer
  const cases = [['angolo della torre di sud-est', 56.5, 50.5, 50.5, 58.5], ['angolo della torre di sud-ovest', 3.5, 50.5, 10.5, 58.5], ['torre ovest del portone', 24.5, 51.5, 21.5, 59.5], ['camminamento (per confronto)', 40.5, 50.5, 40.5, 58.5], ['dietro la balestra di sud-est', 55.5, 49.3, 50.5, 58.5], ['dietro la balestra di sud-ovest', 4.5, 49.3, 10.5, 58.5], ['angolo interno torre sud-est (53,48)', 53.5, 48.5, 48.5, 58.5]];
  for (const [n, dx, dy, sx, sy] of cases) {
    let hit = 0, rock = 0; G.hs = G.time; G.lim = 99999; G.iv = 0; G.half = 1; G.ph = 1;   // l'orologio della partita non scade durante la prova
    for (let k = 0; k < 30; k++) {
      Object.assign(def, { x: dx, y: dy, hp: 4, dn: 0, sf: 0 }); Object.assign(shooter, { x: sx, y: sy, rl: 0 }); G.me = shooter; cq.x = sx; cq.y = sy;
      const [x1, y1] = [dx + (Math.random() - 0.5) * 0.3, dy + (Math.random() - 0.5) * 0.3];
      const d0 = Math.hypot(x1 - sx, y1 - sy), e = [sx + (x1 - sx), sy + (y1 - sy)];
      const a = AS.mkArrow(G, shooter, ...(() => { const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5, sp = 0.12 + 0.045 * d0, an = Math.atan2(y1 - sy, x1 - sx) + g() * sp * 0.09, dd = d0 * (1 + g() * 0.05); return [sx + Math.cos(an) * dd + g() * sp * 0.25, sy + Math.sin(an) * dd + g() * sp * 0.25]; })());
      for (let i = 0; i < 40 && !a.te; i++) { G.time += 0.05; G.M.tick(G, 0.05); }
      if (a.hit === def.id) hit++;
    }
    for (let k = 0; k < 20; k++) {
      Object.assign(def, { x: dx, y: dy, hp: 4, dn: 0, sf: 0 }); G.ct.x = sx; G.ct.y = sy + 6; G.ct.rl = 0; G.ct.n = 3; G.ct.dn = 0; G.ct.drv = -1; Object.assign(shooter, { x: sx + 1.2, y: sy + 6.6 }); cq.x = sx + 1.2; cq.y = sy + 6.6;
      AS.fireCt(G, shooter, dx + (Math.random() - 0.5) * 1.6, dy + (Math.random() - 0.5) * 1.6); for (let i = 0; i < 80 && G.rk.some(r => !r.te); i++) { G.time += 0.05; G.M.tick(G, 0.05); }
      if (def.hp < 4 || (def.dn > G.time)) rock++;
    }
    // aggancio: provo tanti punti del cerchio entro 12 caselle; quelli che SULLO SCHERMO cadono sulla figura del difensore (dai piedi alla testa) devono agganciarlo
    Object.assign(def, { x: dx, y: dy, hp: 4, dn: 0, sf: 0 }); G.me = shooter; cq.x = sx; cq.y = sy;
    const scr = (x, y, z) => [(x - y) / 2, (x + y) / 4 - 0.575 * z], zd = cqHc(Math.floor(dx), Math.floor(dy)) * 0.8; let on = 0, lkN = 0;
    for (let i = 0; i < 4000; i++) { const an = Math.random() * 7, r = 1.6 + Math.random() * 10.4, ax = sx + Math.cos(an) * r, ay = sy + Math.sin(an) * r, [px, py] = scr(ax, ay, cqHc(Math.floor(ax), Math.floor(ay)) * 0.8);
      const [fx, fy] = scr(dx, dy, zd + 0.75); if (Math.abs(px - fx) < 0.18 && Math.abs(py - fy) < 0.4) { on++; const lk = AS.lockAt(G, ax, ay, r, null); if (lk && Math.hypot(lk.x - dx, lk.y - dy) < 0.1) lkN++; } }
    const lkTxt = on ? lkN + '/' + on : 'figura fuori portata';
    out.push(n + ': frecce a segno ' + hit + '/30, sassi che fanno danno ' + rock + '/20, cerchio sopra la figura: aggancia ' + lkTxt);
  }
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300));
  return out.join('\n');
})()
