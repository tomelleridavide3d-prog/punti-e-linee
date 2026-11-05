// Ritiro mossa tra giocatori online (3 pagine, Firebase vero): A sfida B a 3+2, C guarda. A chiede e B rifiuta, B chiede e A accetta,
// A chiede col turno suo (toglie 2 semimosse) e B accetta; stesse mosse sui 3 telefoni e pezzi giusti. Uso: node prove/cdp2.mjs . prove/chtb.mjs
export const n = 3;
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const join = `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzScaA'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2500)); return 'dentro ' + !!cq.net; })()`;
const sit = i => `(async () => { const p = cqSalaSeats()[${i}]; cq.x = p.x + 0.6; cq.y = p.y + 0.6; await new Promise(r => setTimeout(r, 300)); cqSitToggle(); await new Promise(r => setTimeout(r, 1200)); return 'seduto ' + cq.sit; })()`;
// gioca da solo: quando tocca al mio colore pensa (forte e veloce) e muove come col dito (CHS.move = la mossa dalla scacchiera)
const auto = `(() => { clearInterval(window.__a); window.__busy = 0; window.__a = setInterval(() => { const T = CHS.T; if (!T || T.me < 0 || window.__busy) return; const S = T.S;
  if (S.ph !== 'play' || CH.colorOf(S, T.me) !== (S.mv.length & 1)) return;
  window.__busy = 1; const len = S.mv.length;
  CH.think(S.mv.slice(), CH.aiOpts(T.me ? 60 : 100, 120), r => { setTimeout(() => { window.__busy = 0; const T2 = CHS.T; if (r && T2 && T2.S.mv.length === len && T2.S.ph === 'play') CHS.move(r.m); }, 150); });
}, 200); return 'gioco da solo'; })()`;
const st = `(() => { const T = CHS.T; if (!T) return 'nessuna partita'; const S = T.S; if (!S.mv) return 'fase ' + S.ph; const now = T.host ? Date.now() : (S.pub || 0) + (Date.now() - (T.rcv || 0));
  return S.ph + ' v' + S.v + ' io ' + T.me + ' bianco ' + S.wc + ' mosse ' + S.mv.length + ' [' + S.mv.slice(-4).join(' ') + '] orologi ' + (S.ck ? [0, 1].map(c => CH.fmt(CH.left(S, c, now))).join('/') : '-') + ' patta ' + S.dro + ' ritiro ' + S.tbo + ' fine ' + (S.why || '') + ' vince ' + S.win + ' tavolo ' + (S.sc || []).join('-') + ' guardano ' + (T.watch || 0); })()`;
const sig = `(() => { const S = CHS.T && CHS.T.S; return S ? 'FIRMA ' + S.g + ':' + S.mv.join('') .length + ':' + S.mv.join(',').slice(-60) + ':' + S.ph : 'nessuna'; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
const stop = `(() => { clearInterval(window.__a); return 'fermo'; })()`;
const look = who => `(() => { const m = document.querySelector('.chMsg'), b = CHS.T.bTb; return '${who} vede: "' + (m ? m.innerText.replace(/\s+/g, ' ') : '') + '" pulsante "' + b.textContent + '" ' + (b.disabled ? 'spento' : 'acceso') + (b.hidden ? ' nascosto' : '') + ' pezzi ' + document.querySelectorAll('.chRoot .chP:not(.chGone)').length; })()`;
const click = k => `(() => { const e = document.querySelector('.chMsg [data-k=${k}]'); if (!e) return 'pulsante ${k} assente'; e.click(); return 'premuto ${k}'; })()`;
const ask = `(() => { const b = CHS.T.bTb; if (b.disabled) return 'Ritira spento'; b.click(); return 'chiede ritiro con ' + CHS.T.S.mv.length + ' semimosse, tocca a ' + (CHS.T.S.mv.length & 1); })()`;
const pcs = `(() => { const T = CHS.T, b = CH.E.board64(CH.E.replay(T.S.mv)).filter(x => x && x !== '.').length; return 'pezzi in scacchiera ' + document.querySelectorAll('.chRoot .chP:not(.chGone)').length + ' attesi ' + b; })()`;
export default [
  [0, name('zzScaA'), 0], [1, name('zzScaB'), 0], [2, name('zzScaC'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 0], [2, join, 1500],
  [0, sit(0), 0], [1, sit(1), 2000],
  [0, `(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('bcHallB').click(); await w(400);
    [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('Scacchi')).click(); await w(400);
    const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzScaB')); if (!b) return 'amico non in lista';
    b.click(); await w(400);
    document.querySelector('#tvModal .chD[data-n=ck] [data-v="3+2"]').click(); document.querySelector('#tvModal [data-k=go]').click(); return 'sfidato 3+2'; })()`, 3000],
  [1, `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; m.querySelector('[data-k=ok]').click(); return 'accetta'; })()`, 3500],
  [2, `(async () => { const k = CHS.games()[0]; if (!k) return 'niente da guardare'; CHS.watch(k.key); await new Promise(r => setTimeout(r, 1500)); return 'C guarda'; })()`, 0],
  [0, look('A appena iniziato'), 0],
  [0, auto, 0], [1, auto, 7000],
  [0, stop, 0], [1, stop, 2500],
  [0, st, 0],
  // 1) A chiede, B rifiuta
  [0, ask, 2500], [1, look('B'), 0], [2, look('C'), 0], [0, look('A'), 0],
  [1, click('tn'), 2500], [0, look('A dopo il no'), 0], [0, st, 0],
  // 2) B chiede, A accetta
  [1, ask, 2500], [0, look('A'), 0], [0, click('ta'), 2500],
  [0, st, 0], [1, st, 0], [2, st, 0], [0, pcs, 0], [1, pcs, 0], [2, pcs, 0],
  // 3) B muove una volta, poi A chiede col turno di A gia' passato o no: chi chiede torna sempre al suo turno
  [0, ask, 2500], [1, look('B'), 0], [1, click('ta'), 2500],
  [0, st, 0], [1, st, 0], [2, st, 0], [0, pcs, 0], [1, pcs, 0], [2, pcs, 0],
  // 4) si riprende a giocare e tutto resta allineato
  [0, auto, 0], [1, auto, 8000], [0, stop, 0], [1, stop, 2500],
  [0, sig, 0], [1, sig, 0], [2, sig, 0], [0, st, 0], [1, st, 0],
  [1, `(async () => { window.confirm = () => true; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 2000)); return 'B esce'; })()`, 0],
  [0, `(async () => { window.confirm = () => true; const x = document.querySelector('.tvX'); if (x) x.click(); await new Promise(r => setTimeout(r, 1500)); return 'A esce'; })()`, 0],
  [0, errs, 0], [1, errs, 0], [2, errs, 0],
];
