// Cactus nel browser (Firefox senza finestra): node prove/firefox2.mjs . prove/cactus.html prove/ct2.mjs
// Gioca partite intere coi TOCCHI VERI (pulsanti, mazzo, carte) con 1-5 computer e i 3 livelli: scambi, coppie fuori turno, Stop, poteri J e Q,
// riquadro finale e Rivincita; poi una foto a meta' partita (senza animazioni veloci) con la carta pescata in mano.
const SHOT = process.env.CT_SHOT || '';
const play = `(async () => {
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  window.__CTFAST = true;
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const vis = () => { const a = document.querySelector('#ctAct'); return a && !a.hidden ? a : null; };
  const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const choose = (name, v) => { const b = document.querySelector('.pkD[data-n=' + name + '] .opts button[data-v="' + v + '"]'); click(b); };
  const cov = { games: 0, swap: 0, pair: 0, disc: 0, J: 0, Q: 0, stop: 0, deckTap: 0, ok: 0, ko: 0, rows: 0 };
  for (const [op, lv] of [[1, 1], [2, 2], [3, 3], [4, 1], [5, 2], [3, 2]]) {
    if (cov.games === 0) { choose('op', String(op)); choose('lv', String(lv)); click(document.querySelector('[data-k=go]')); }
    else { CT.U.o = { op: String(op), lv: String(lv) }; click(document.querySelector('.pkOv [data-k=r]')); }
    let myTurns = 0, guard = 0;
    while (guard++ < 4000) {
      await sl(15);
      const end = [...document.querySelectorAll('.pkOv h2')].find(h => /vinto|finita/.test(h.textContent));
      if (end) { cov.rows += document.querySelectorAll('.pkOv .pkRows div').length === op + 1 ? 1 : 0; break; }
      const a = vis(); if (!a) continue;
      const bs = [...a.querySelectorAll('.main button')], by = k => bs.find(b => b.dataset.k === k);
      const taps = [...document.querySelectorAll('#ctT .pkC.tap')];
      if (by('ok')) { click(by('ok')); continue; }
      const hint = a.querySelector('.hint').textContent;
      if (/carta uguale/.test(hint) && taps.length && Math.random() < 0.08) { cov.pair++; click(taps[Math.floor(Math.random() * taps.length)]); continue; }
      if (/^Hai una carta uguale/.test(hint)) continue;
      if (by('d')) {
        myTurns++;
        if (by('s') && myTurns > 5) { cov.stop++; click(by('s')); continue; }
        if (myTurns % 2) { cov.deckTap++; click(document.querySelector('#ctDeck')); } else click(by('d'));
        continue;
      }
      if (by('sw')) {
        const r = myTurns % 3;
        if (r === 1) { cov.swap++; click(by('sw')); } else { cov.disc++; click(by('di')); }
        continue;
      }
      if (by('di')) { cov.disc++; click(by('di')); continue; }
      if (taps.length && by('sk') && /^J/.test(a.querySelector('.hint').textContent)) { cov.J++; click(taps[0]); continue; }
      if (taps.length && by('sk') && /^Q/.test(a.querySelector('.hint').textContent)) { cov.Q++; click(taps[taps.length - 1]); continue; }
      if (taps.length) { click(taps[0]); continue; }
      if (by('sk')) { click(by('sk')); continue; }
      if (by('b')) { click(by('b')); continue; }
    }
    const G = CT.U.G;
    for (const e of G.ev) { if (e.t === 'throw' && e.p === 0) e.ok ? cov.ok++ : cov.ko++; if (e.t === 'throw' && e.p !== 0) cov.bot = (cov.bot || 0) + (e.ok ? 1 : 0); }
    const all = [...G.deck, ...G.pile, ...G.P.flatMap(p => p.slots.filter(c => c != null))];
    if (!G.over || all.length !== 54 || new Set(all).size !== 54) errs.push('partita ' + cov.games + ': finita ' + G.over + ', carte ' + all.length);
    cov.games++;
  }
  return JSON.stringify({ cov, errs });
})()`;
// una partita lenta (com'e' sul telefono) fino alla mia prima carta pescata: la foto
const shot = `(async () => {
  window.__CTFAST = false; window.__CTFIRST = 0;
  const click = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  CT.stop(true); CT.start({ name: 'Davide' });
  const choose = (name, v) => click(document.querySelector('.pkD[data-n=' + name + '] .opts button[data-v="' + v + '"]'));
  choose('op', '3'); click(document.querySelector('[data-k=go]'));
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 200 && !document.querySelector('#ctAct .main [data-k=ok]'); i++) await sl(50);
  await sl(400); click(document.querySelector('#ctAct .main [data-k=ok]'));
  for (let i = 0; i < 200 && !document.querySelector('#ctAct:not([hidden]) .main [data-k=d]'); i++) await sl(50);
  click(document.querySelector('#ctAct .main [data-k=d]'));
  for (let i = 0; i < 200 && !document.querySelector('#ctAct:not([hidden]) .main [data-k=sw]'); i++) await sl(50);
  return 'pronta';
})()`;
export default [[play, 200], ...(SHOT ? [[shot, 1200, SHOT]] : [])];
