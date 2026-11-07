// Prova dello schermo del poker (cdp.mjs su prove/poker.html): scelte, partita intera coi tocchi veri, sovrapposizioni, fine, rivincita.
// Uso: PAGE=prove/poker.html node cdp.mjs . prove/pk2.js [foto.png]   (window.__OP = avversari, default 7; window.__SHOTAT = mano della foto)
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), out = { err: [] };
  addEventListener('error', e => out.err.push(String(e.message)));
  addEventListener('unhandledrejection', e => out.err.push('promise: ' + String(e.reason && (e.reason.stack || e.reason))));
  window.__PKFAST = 1;
  const $ = s => document.querySelector(s);
  // scelte: avversari e fine partita dalle tendine, come farebbe una persona
  const pickOpt = (n, v) => { const d = $(`.pkD[data-n=${n}]`); d.open = true; d.querySelector(`.opts button[data-v="${v}"]`).click(); return d.open === false; };
  out.closes = pickOpt('op', String(window.__OP || 7)) && pickOpt('fi', '20') && pickOpt('ch', '500') && pickOpt('bu', '5');
  $('[data-k=go]').click(); await sl(300);
  const U = PK.U; out.players = U.G.P.length;
  const overlaps = () => {
    const S = $('#pkS'), items = [];
    const add = (e, name, g) => { const b = e.getBoundingClientRect(); if (b.width && b.height && getComputedStyle(e).opacity !== '0') items.push({ name, g, b }); };
    S.querySelectorAll('.pkSeat').forEach((s, k) => s.querySelectorAll('.pkAv,.pkPlate').forEach(e => add(e, 's' + k + e.className, 's' + k)));
    S.querySelectorAll('.pkSlot').forEach((e, i) => add(e, 'posto' + i, 'board'));
    for (const id of ['#pkHand', '#pkMe', '#pkAct', '#pkTop']) { const e = $(id); if (e && !e.hidden) add(e, id, id); }
    const hit = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]; if (a.g === b.g) continue;
      const ox = Math.min(a.b.right, b.b.right) - Math.max(a.b.left, b.b.left), oy = Math.min(a.b.bottom, b.b.bottom) - Math.max(a.b.top, b.b.top);
      if (ox > 1 && oy > 1) hit.push(a.name + ' X ' + b.name);
    }
    const off = items.filter(a => a.b.left < -1 || a.b.right > innerWidth + 1 || a.b.top < -1 || a.b.bottom > innerHeight + 1).map(a => a.name);
    return { hit, off };
  };
  let taps = 0, folds = 0, raises = 0, games = 0, maxCards = 0, sawReveal = false, sawWin = false, lay = null, t0 = Date.now(), handName = '';
  for (let step = 0; step < 6000 && Date.now() - t0 < 100000; step++) {
    await sl(25);
    const act = $('#pkAct');
    if (act && !act.hidden) {
      if (!lay) lay = overlaps();
      handName = $('#pkHand').textContent;
      maxCards = Math.max(maxCards, document.querySelectorAll('.pkC').length);
      const r = Math.random(), raise = act.querySelector('.main .r');
      let b = act.querySelector('.main .k');
      if (r < 0.15) { b = act.querySelector('.main .f'); folds++; }
      else if (r < 0.3 && !raise.classList.contains('hide')) { const pre = [...act.querySelectorAll('.pre button')].filter(x => x.dataset.p !== 'a'); pre[Math.floor(Math.random() * pre.length)].click(); b = raise; raises++; }
      b.click(); taps++;
      if (window.__SHOTAT && U.G.hand >= window.__SHOTAT && U.G.board.length >= 3) { window.__PKFAST = 0; await sl(1800); return Object.assign(out, { shot: true, hand: U.G.hand }); }
    }
    if (document.querySelector('.pkC.win')) sawWin = true;
    if ([...document.querySelectorAll('.pkC')].some(o => !o.classList.contains('down') && o.style.width === '36px')) sawReveal = true;
    const endB = document.querySelector('.pkOv [data-k=r]');
    if (endB) {
      games++; out['fine' + games] = document.querySelector('.pkOv h2').textContent + ' | ' + document.querySelector('.pkOv p').textContent;
      if (games >= 2) break;
      endB.click(); await sl(200);
    }
  }
  // la tabella delle mani si apre e si chiude
  const ov = document.querySelector('.pkOv'); if (ov) ov.remove();
  $('#pkTop [data-k=h]').click(); await sl(100); out.table = document.querySelectorAll('.pkHT img').length; document.querySelector('.pkOv [data-k=x]').click();
  return Object.assign(out, { taps, folds, raises, games, maxCards, sawReveal, sawWin, handName, lay, ms: Date.now() - t0, store: localStorage.getItem('pkS') });
})()
