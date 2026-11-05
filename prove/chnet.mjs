// Scacchi online (3 pagine, Firebase vero): A e B seduti al tavolino, A sfida B con l'orologio 3+2, B accetta (vede la cadenza nella sfida),
// C guarda. Patta proposta da B e rifiutata da A, partita giocata da sola fino in fondo, stesse mosse sui 3 telefoni, orologi coerenti,
// rivincita a colori invertiti, uscita. Uso: node prove/cdp2.mjs . prove/chnet.mjs
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
  return S.ph + ' v' + S.v + ' io ' + T.me + ' bianco ' + S.wc + ' mosse ' + S.mv.length + ' [' + S.mv.slice(-4).join(' ') + '] orologi ' + (S.ck ? [0, 1].map(c => CH.fmt(CH.left(S, c, now))).join('/') : '-') + ' patta ' + S.dro + ' fine ' + (S.why || '') + ' vince ' + S.win + ' tavolo ' + (S.sc || []).join('-') + ' guardano ' + (T.watch || 0); })()`;
const sig = `(() => { const S = CHS.T && CHS.T.S; return S ? 'FIRMA ' + S.g + ':' + S.mv.join('') .length + ':' + S.mv.join(',').slice(-60) + ':' + S.ph : 'nessuna'; })()`;
const errs = `(() => 'errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 300))()`;
export default [
  [0, name('zzScaA'), 0], [1, name('zzScaB'), 0], [2, name('zzScaC'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); return 'party aperto'; })()`, 500],
  [1, join, 0], [2, join, 1500],
  [0, sit(0), 0], [1, sit(1), 2000],
  [0, `(async () => { const w = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('bcHallB').click(); await w(400);
    [...document.querySelectorAll('#bcModal button')].find(b => b.textContent.includes('Scacchi')).click(); await w(400);
    const b = [...document.querySelectorAll('#tvModal button')].find(b => b.textContent.includes('zzScaB')); if (!b) return 'amico seduto non in lista: ' + document.getElementById('tvModal').innerText.replace(/\\s+/g, ' ');
    b.click(); await w(400);
    document.querySelector('#tvModal .chD[data-n=ck] [data-v="3+2"]').click(); document.querySelector('#tvModal [data-k=go]').click(); return 'sfidato a scacchi 3+2'; })()`, 3000],
  [1, `(() => { const m = document.getElementById('tvModal'); if (!m) return 'NESSUNA SFIDA'; const t = m.innerText.replace(/\\s+/g, ' '); m.querySelector('[data-k=ok]').click(); return t; })()`, 3500],
  [0, st, 0], [1, st, 0],
  [2, `(async () => { const k = CHS.games()[0]; if (!k) return 'nessuna partita da guardare'; CHS.watch(k.key); await new Promise(r => setTimeout(r, 1500)); return 'C guarda: ' + (CHS.T && CHS.T.me) + ' pezzi ' + document.querySelectorAll('.chRoot .chP').length; })()`, 0],
  [0, auto, 0], [1, auto, 9000],
  [0, st, 0], [1, st, 0], [2, st, 0],
  // B propone la patta, A la vede e la rifiuta
  [0, `(() => { clearInterval(window.__a); return 'A si ferma'; })()`, 0], [1, `(() => { clearInterval(window.__a); return 'B si ferma'; })()`, 1500],
  [1, `(() => { CHS.act({ k: 'dr' }); return 'B propone patta'; })()`, 2500],
  [0, `(() => { clearInterval(window.__a); const m = document.querySelector('.chMsg'); const t = m ? m.innerText : ''; const n = document.querySelector('.chMsg [data-k=dn]'); if (n) n.click(); return 'A vede: ' + t; })()`, 2500],
  [1, st, 0], [2, `(() => document.querySelector('.chMsg').innerText)()`, 0],
  [0, auto, 0], [1, auto, 60000],
  [0, st, 0], [1, st, 0], [2, st, 0],
  [0, sig, 0], [1, sig, 0], [2, sig, 0],
  [0, `(() => { const e = document.querySelector('.tvEnd'); return 'A riquadro: ' + (e ? e.innerText.replace(/\\s+/g, ' ').slice(0, 150) : 'NO'); })()`, 0],
  [1, `(() => { const e = document.querySelector('.tvEnd'); if (!e) return 'B: nessun riquadro'; e.querySelector('button').click(); return 'B chiede la rivincita'; })()`, 1500],
  [0, `(() => { const e = document.querySelector('.tvEnd'); if (!e) return 'A: nessun riquadro'; e.querySelector('button').click(); return 'A accetta la rivincita'; })()`, 3000],
  [0, st, 0], [1, st, 0], [2, st, 0],
  [1, `(async () => { clearInterval(window.__a); window.confirm = () => true; document.querySelector('.tvX').click(); await new Promise(r => setTimeout(r, 2500)); return 'B esce'; })()`, 0],
  [0, st, 0], [2, st, 0],
  [0, errs, 0], [1, errs, 0], [2, errs, 0],
];
