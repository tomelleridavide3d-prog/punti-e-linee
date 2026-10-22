// La casa delle trappole, passo 4: guardia (il computer ruba nella mia villa, io guardo dalle telecamere e uso i jolly), cambio, mio furto
// con il computer padrone (telecamere, jolly, mantello), risultato della manche. Piu' furti del computer per vedere tempi e riuscita.
// uso: node prove/cdp.mjs . prove/tr4.js [foto.png]   (con la foto: la guardia con la telecamera del salone)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzTrProva'; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzTrProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=trappole]').click(); await w(2500);
  store.settings.cqModeOpt = store.settings.cqModeOpt || {}; store.settings.cqModeOpt.trappole = { map: 'villa', n: 2, fill: true, nt: window.__NT ? 1 : 0 }; saveStore();
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(3600);
  const G = cq.g, T = window.__tr, toasts = []; window.cqToast = t => toasts.push(String(t).replace(/<[^>]+>/g, ''));
  out.push('computer: ' + (G.bot ? G.bot.name : 'NESSUNO'));
  // la mia villa: diamante nella credenza del salone, telecamere in salone e ingresso, lampadario e armatura che cade nel salone, un po' di trappole
  const P = (k, x, y) => { const e = T.place(G.mine, k, x, y); if (e) out.push('NON MESSA ' + k + ': ' + e); };
  P('dia', 14, 10); P('fake', 15, 10); P('cam', 16, 14); P('cam', 16, 24); P('jl', 15, 12); P('ja', 13, 10); P('botola', 16, 19); P('buccia', 20, 22);
  if (window.__SHOT !== 'no') { T.buildDone(G); for (let i = 0; i < 20 && G.ph !== "guard"; i++) cqModeTick(0.05); await w(200); for (let i = 0; i < 40; i++) { if (camSeesBot()) break; await w(250); } return out.join('\n'); }
  function camSeesBot() { return T.camSees(G, G.bot.x, G.bot.y); }
  cq.on = false; cancelAnimationFrame(cq.raf);
  T.buildDone(G); for (let i = 0; i < 20 && G.ph !== "guard"; i++) cqModeTick(0.05);
  out.push('fase ' + G.ph + ' | telecamere: ' + G.camList.join(', ') + ' | pulsanti: ' + document.querySelectorAll('#trCams button').length + ' | barra: ' + G.M.hud(G).replace(/<[^>]+>/g, ''));
  // guardia: guardo il salone; quando il ladro e' sotto il lampadario lo faccio cadere
  let fired = [], seen = 0, camSw = 0;
  for (let i = 0; i < 20 * 95 && G.ph === 'guard'; i++) {
    cqModeTick(0.05); G.M.local(G, 0.05);
    if (camSeesBot()) seen++;
    const b = G.bot; if (Math.hypot(b.x - 16.5, b.y - 24.5) < 5 && G.camI !== 1) { T.camSet(G, 1); camSw++; } else if (b.y < 20 && b.x > 10 && b.x < 23 && G.camI !== 0) { T.camSet(G, 0); camSw++; }
    const j = T.jollyHere(G); if (j && !G.jused.has(j.key)) { const c = j.cells[0], d = Math.hypot(b.x - c[0] - 0.5, b.y - c[1] - 0.5); if (d < 1.2 && G.M.hide(G.bot) === false) { const hp = G.hp; G.M.act(G); fired.push(j.k + '@' + G.time.toFixed(1)); } }
  }
  out.push('guardia: ' + G.st.msg + ' | visto dalle telecamere ' + Math.round(seen / 20) + ' s | cambi ' + camSw + ' | jolly ' + fired.join(' ') + ' | mobili aperti ' + G.open.length + ' | trappole evitate ' + [...G.ai.avoid].filter(k => !k.endsWith('?')).length + ' | mantello ' + G.ai.cloakUsed);
  out.push('avvisi della guardia: ' + toasts.filter(t => /ladro|Ladro|cane|telecomando/.test(t)).slice(0, 6).join(' / '));
  out.push('fase ' + G.ph + ' | scritta: ' + G.M.big(G).replace(/\n/g, ' '));
  // la villa del computer per il mio furto: lampadario in ingresso con la telecamera
  const VB = { items: [] }; const Q = (k, x, y) => { const e = T.place(VB, k, x, y); if (e) out.push('NON MESSA (computer) ' + k + ': ' + e); }; G.villa[G.opp.id] = VB;
  Q('dia', 21, 1); Q('cam', 16, 24); Q('jl', 16, 23); Q('ja', 11, 23);
  for (let i = 0; i < 80 && G.ph === 'inter'; i++) cqModeTick(0.05); const tk = () => { cqModeTick(0.05); G.M.local(G, 0.05); };
  out.push('mio furto: fase ' + G.ph + ' | mantello: ' + !!document.getElementById('trCloak') + ' | ' + G.M.hud(G).replace(/<[^>]+>/g, ''));
  // passo sotto il lampadario del computer (stanza con la sua telecamera): lo fa cadere
  cq.x = 16.5; cq.y = 23.5; for (let i = 0; i < 30; i++) tk();
  out.push('sotto il lampadario: jolly del computer ' + [...G.jused].join(',') + ' | cuori ' + G.hp + ' | ' + (G.stunT || ''));
  for (let i = 0; i < 50; i++) tk();
  // col mantello passo vicino all'armatura che cade: non mi vede
  document.getElementById('trCloak').click(); cq.x = 11.6; cq.y = 24.2; for (let i = 0; i < 20; i++) tk();
  out.push('col mantello vicino all\'armatura: usata ' + G.jused.has(G.rv.items.find(o => o.k === 'ja').key) + ' | mantello: ' + document.getElementById('trCloak').textContent);
  for (let i = 0; i < 100; i++) tk();
  cq.x = 11.6; cq.y = 24.2; for (let i = 0; i < 20; i++) tk();
  out.push('senza mantello vicino all\'armatura: usata ' + G.jused.has(G.rv.items.find(o => o.k === 'ja').key));
  // finisco il furto: cassaforte (numeri giusti) e portone
  for (let i = 0; i < 40; i++) tk();
  cq.x = 21.5; cq.y = 2.35; G.M.act(G); for (let n = 0; n < 3; n++) { G.safe.val = G.safe.nums[n]; G.safe.fv = G.safe.nums[n]; for (let i = 0; i < 14; i++) tk(); }
  cq.x = 16.8; cq.y = 28.6; tk(); for (let i = 0; i < 200 && G.st.step !== 'mres'; i++) tk();
  out.push('fine della manche: ' + String(G.st.msg || G.st.step).split('\n').join(' / '));
  // altri furti del computer in ville fatte dal computer (senza jolly miei): tempi e riuscita
  const res = [];
  for (let k = 0; k < (window.__N || 6); k++) {
    G.phase = 'play'; G.endInfo = null; G.mine = T.cpuBuild(); G.rr = {}; G.st = { n: 1, step: 'run0', t0: G.time, thief: G.opp.id }; T.watchStart(G, G.opp, G.mine);
    for (let i = 0; i < 20 * 95 && G.ph === 'guard'; i++) { cqModeTick(0.05); G.M.local(G, 0.05); }
    const gr = G.rr[G.opp.id] || {}; res.push((gr.ok ? 'si ' + Math.round(gr.t) + 's' : 'no') + ' cuori-' + gr.lost + ' aperti ' + G.open.length);
  }
  out.push('furti del computer: ' + res.join(' | '));
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
