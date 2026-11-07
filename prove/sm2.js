// Prova dello schermo del Sette e mezzo (node prove/cdp.mjs . prove/sm2.js [foto.png] [larghezza] [altezza]):
// dall'hotel (tgSette), tendine, partite intere coi tocchi veri, sovrapposizioni, scritte, fine, rivincita col banco a me.
// window.__OP = computer al tavolo (default 7); window.__SHOT = 1: si ferma a meta' mano per la foto (animazioni vere).
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = { err: [] };
  addEventListener('error', e => out.err.push(String(e.message)));
  addEventListener('unhandledrejection', e => out.err.push('promise: ' + String(e.reason && (e.reason.stack || e.reason))));
  const $ = s => document.querySelector(s);
  if (!window.__SHOT) window.__SMFAST = 1;
  for (const h of document.querySelectorAll('h2')) if (/Benvenuto/.test(h.textContent)) { let e = h; while (e.parentElement && getComputedStyle(e).position !== 'fixed') e = e.parentElement; e.remove(); }
  tgSette();
  for (let i = 0; i < 100 && !(window.SM && SM.U && $('#smT .pkD')); i++) await sl(100);
  const pickOpt = (n, v) => { const d = $(`.pkD[data-n=${n}]`); d.open = true; d.querySelector(`.opts button[data-v="${v}"]`).click(); return d.open === false; };
  out.closes = pickOpt('op', String(window.__OP || 7)) && pickOpt('fi', window.__FI || '10') && pickOpt('ch', '500');
  $('#smT [data-k=go]').click(); await sl(300);
  const overlaps = () => {
    const S = $('#smS'), items = [];
    const add = (e, name, g) => { const b = e.getBoundingClientRect(); if (b.width && b.height && getComputedStyle(e).opacity !== '0') items.push({ name, g, b }); };
    S.querySelectorAll('.pkSeat').forEach((s, k) => s.querySelectorAll('.pkAv,.pkPlate').forEach(e => add(e, 's' + k + e.className, 's' + k)));
    S.querySelectorAll('.pkC').forEach((e, k) => add(e, 'carta' + k, 'carte'));
    S.querySelectorAll('.pkBet').forEach((e, k) => add(e, 'puntata' + k, 'p' + k));
    for (const id of ['#smMe', '#smAct', '#smTop', '#smDeck', '.smBk']) { const e = S.querySelector(id); if (e && !e.hidden) add(e, id, id); }
    const hit = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]; if (a.g === b.g || (b.g === '.smBk' && /pkPlate/.test(a.name))) continue;
      const ox = Math.min(a.b.right, b.b.right) - Math.max(a.b.left, b.b.left), oy = Math.min(a.b.bottom, b.b.bottom) - Math.max(a.b.top, b.b.top);
      if (ox > 2 && oy > 2) hit.push(a.name + ' X ' + b.name);
    }
    const off = items.filter(a => a.b.left < -1 || a.b.right > innerWidth + 1 || a.b.top < -1 || a.b.bottom > innerHeight + 1).map(a => a.name);
    return { hit, off };
  };
  let bets = 0, cards = 0, stands = 0, games = 0, stamps = new Set(), lay = null, maxCards = 0, bankTurns = 0, t0 = Date.now(), msgs = new Set();
  for (let step = 0; step < 20000 && Date.now() - t0 < 150000; step++) {
    await sl(20);
    const st = $('#smStamp div'); if (st && st.textContent && $('#smStamp.go')) stamps.add(st.textContent);
    const m = $('#smMsg'); if (m && m.style.opacity === '1') msgs.add(m.firstChild && m.firstChild.textContent);
    const act = $('#smAct'), U = SM.U;
    if (act && !act.hidden && U.res) {
      maxCards = Math.max(maxCards, document.querySelectorAll('#smS .pkC').length);
      if (U.mode === 'bet') {
        const pre = [...act.querySelectorAll('.pre button')]; pre[Math.floor(Math.random() * pre.length)].click();
        act.querySelector('.main .k').click(); bets++;
      } else {
        if (U.G.bank === 0) bankTurns++;
        if (!lay && U.G.P[0].cards.length >= 2) { await sl(300); lay = overlaps(); }
        if (window.__SHOT && U.G.hand >= 2 && U.G.P[0].cards.length >= 2) { await sl(1500); return Object.assign(out, { shot: true, lay: overlaps() }); }
        if (Math.random() < 0.55) { act.querySelector('.main .k').click(); cards++; } else { act.querySelector('.main .r').click(); stands++; }
      }
    }
    const endB = document.querySelector('#smT .pkOv [data-k=r]');
    if (endB) {
      games++; out['fine' + games] = document.querySelector('#smT .pkOv h2').textContent + ' | ' + document.querySelector('#smT .pkOv p').textContent;
      if (games >= 2) break;
      window.__SMBANK = 1; endB.click(); await sl(200);
    }
  }
  // le regole si aprono e si chiudono
  const ov = document.querySelector('#smT .pkOv'); if (ov) ov.remove();
  $('#smTop [data-k=ru]').click(); await sl(100); out.rules = !!$('#smT .smRu'); $('#smT .smRu [data-k=x]').click();
  return Object.assign(out, { bets, cards, stands, games, bankTurns, stamps: [...stamps], msgs: [...msgs].slice(0, 12), maxCards, lay, ms: Date.now() - t0, rec: JSON.stringify(store.settings.smSt) });
})()
