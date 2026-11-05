// Foto della scacchiera nell hotel a meta partita (contro il Conte, lampo 3+2): node prove/cdp.mjs . prove/ch5.js foto.png
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzScaA'; store.settings.sound = false; store.settings.chAda = 30; store.settings.chSt = {}; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzScaA'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(400); openCiack(); $('#pkGo').click(); await w(1500); $('#netNew').click(); await w(3500);
  const p = cqSalaSeats()[0]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await w(300); cqSitToggle(); await w(1500);
  const cb = document.getElementById('bcHallB'); o.push('pulsante ' + (cb && !cb.hidden ? cb.textContent : 'NO')); if (!cb || cb.hidden) return o.join(' | ');
  cb.click(); await w(400);
  const sb = [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('Scacchi')); o.push('scelta scacchi ' + !!sb); if (!sb) return o.join(' | ');
  sb.click(); await w(400);
  document.querySelector('#tvModal [data-k=ai]').click(); await w(400);
  const pk = (n, v) => { const b = document.querySelector(`#tvModal .chD[data-n=${n}] [data-v="${v}"]`); if (b) b.click(); return !!b; };
  o.push('scelte ' + [pk('lv', 'ada'), pk('wc', '0'), pk('ck', '3+2')].join(','));
  document.querySelector('#tvModal [data-k=go]').click(); await w(1500);
  const T = CHS.T; o.push('aperta ' + !!T + ' pezzi ' + document.querySelectorAll('.chRoot .chP').length + ' bianco=' + (T && T.S.wc) + ' orologio ' + (T && T.S.ck && T.S.ck.k) + ' livello ' + (T && T.S.lv));
  if (!T) return o.join(' | ');
  // col dito: tocco sul pedone e2 (mosse possibili), tocco su e4; poi trascinamento del cavallo g1 -> f3
  const B = document.querySelector('.chRoot .chB'), r = B.getBoundingClientRect(), sz = r.width / 8;
  const at = n => ({ clientX: r.left + (n.charCodeAt(0) - 97 + 0.5) * sz, clientY: r.top + (8 - +n[1] + 0.5) * sz });
  const pe = (type, n, dy) => { const c = at(n); B.dispatchEvent(new PointerEvent(type, { clientX: c.clientX, clientY: c.clientY - (dy || 0), pointerId: 1, pointerType: 'mouse', bubbles: true })); };
  pe('pointerdown', 'e2'); pe('pointerup', 'e2'); await w(200);
  o.push('mosse di e2: pallini ' + document.querySelectorAll('.chRoot .chDot').length);
  pe('pointerdown', 'e4'); await w(300);
  o.push('dopo e4: mosse ' + T.S.mv.join(','));
  for (let i = 0; i < 40 && (T.S.mv.length & 1); i++) await w(100);
  o.push('il Conte risponde ' + T.S.mv[1] + ' (' + (CHS.T.scr.top.querySelector('small') || {}).textContent + ')');
  pe('pointerdown', 'g1'); pe('pointermove', 'g2'); pe('pointermove', 'f3'); pe('pointerup', 'f3'); await w(300);
  o.push('trascinato: ' + T.S.mv.slice(-1)[0] + ' orologi ' + [...document.querySelectorAll('.chRoot .chClk')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '')).join(' / '));
  for (const u of ["d2d4","b1c3"]) { for (let i = 0; i < 60 && (CHS.T.S.mv.length & 1); i++) await w(100); CHS.act({ k: "mv", u }); await w(400); } for (let i = 0; i < 60 && (CHS.T.S.mv.length & 1); i++) await w(100); CHS.T.scr.V.select(CH.idxOf("c3")); return o.join(" | ");
  let n = 0;
  for (let i = 0; i < 2000 && CHS.T && CHS.T.S.ph === 'play'; i++) {
    const S = CHS.T.S;
    if ((S.mv.length & 1) === 0 && !CHS.T.myT) {
      CHS.T.myT = 1; CH.think(S.mv.slice(), CH.aiOpts(100, 150), rr => { CHS.T.myT = 0; if (rr && CHS.T.S.ph === 'play' && (CHS.T.S.mv.length & 1) === 0) { CHS.act({ k: 'mv', u: rr.m }); n++; } });
    }
    if (n === 12 && !o.shot) { o.shot = 1; window.__SHOT = 1; await w(700); window.__SHOT = 0; }
    await w(60);
  }
  const S = CHS.T.S; await w(2200);
  const end = document.querySelector('.tvEnd');
  o.push('fine: ' + S.why + ' vince ' + S.win + ' in ' + S.mv.length + ' semimosse; riquadro "' + (end ? end.innerText.replace(/\s+/g, ' ').slice(0, 160) : 'NO') + '"');
  o.push('forza adattiva ' + store.settings.chAda + ' risultati ' + JSON.stringify(store.settings.chSt));
  const rv = end && end.querySelector('button'); if (rv) { rv.click(); await w(1500); }
  o.push('rivincita: fase ' + CHS.T.S.ph + ' bianco=' + CHS.T.S.wc + ' (prima 0) mosse ' + CHS.T.S.mv.length + ' tavolo ' + CHS.T.S.sc.join('-'));
  for (let i = 0; i < 40 && !CHS.T.S.mv.length; i++) await w(100);
  o.push('nella rivincita il Conte apre con ' + CHS.T.S.mv[0]);
  window.confirm = () => true; document.querySelector('.tvX').click(); await w(500);
  o.push('uscito ' + !CHS.T + ' errori ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 200));
  return o.join('\n');
})()
