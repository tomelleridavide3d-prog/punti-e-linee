// Battaglia di palle di neve, passo 4: il TUTORIAL col dito (tutti i passi, in tempo reale) e la MEMORIA di Pierino (cosa ha capito, fortini che funzionano).
// uso: node prove/cdp.mjs . prove/neve4.js [foto.png]
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzNeProva'; store.settings.sound = false; delete store.settings.nevePi; delete store.settings.neveTut; saveStore();
  try { localStorage.setItem('neveHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzNeProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=neve]').click(); await w(2500);
  out.push('riquadro del tutorial: ' + ($('#tkBody').textContent.includes('Prima volta?') ? 'ok' : 'MANCA'));
  cqCloseTask(); cqLobby(); await w(300); window.neveTutorial(); await w(4200);
  const G = cq.g; if (!G || G.mode !== 'neve') return out.concat('partita non partita').join('\n');
  const N = window.__neve, step = () => (G.tutS || 0), bub = () => { const e = document.querySelector('#nvTut span'); return e ? e.textContent.slice(0, 50) : '(niente)'; };
  const waitStep = async (k, ms = 4000) => { for (let t = 0; t < ms && step() < k; t += 100) await w(100); return step() >= k; };
  out.push('tutorial: ' + G.tut + ', passo ' + step() + ' | ' + bub() + ' | dito ' + (document.querySelector('#nvTut .fg') && document.querySelector('#nvTut .fg').style.display !== 'none' ? 'si' : 'no'));
  // 1. un muro
  N.myBuild(G, 'w', [[8.6, 5.6], [8.6, 10]]); out.push('1 muro -> ' + (await waitStep(1)) + ' | ' + bub());
  // 2. ripassato
  N.myBuild(G, 'w', [[8.6, 5.6], [8.6, 10]]); out.push('2 doppio -> ' + (await waitStep(2)) + ' | ' + bub());
  // 3. un angolo
  N.myBuild(G, 'w', [[9.4, 11.2], [9.4, 13.4], [7.4, 13.4]]); out.push('3 angolo -> ' + (await waitStep(3)) + ' | ' + bub());
  // 4. igloo
  N.U.tool = 'i'; N.myBuild(G, 'i', [[4.5, 11.4]]); N.U.tool = 'w'; out.push('4 igloo -> ' + (await waitStep(4)) + ' | ' + bub());
  // 5. pronto (Pierino ha costruito? aspetta)
  out.push('Pierino pronto: ' + !!G.st.p[1].rd + ', tempo della costruzione ' + G.st.bt);
  N.myReady(G); out.push('5 pronto -> ' + (await waitStep(5, 6000)) + ' | fase ' + G.st.ph + ' | ' + bub());
  // 6-7. pallonetto e dritto
  const bot = G.chars[1]; for (let t = 0; t < 60 && G.st.ph !== 'fight'; t++) await w(100); await w(1500);
  N.myThrow(G, 'l', bot.x, bot.y); out.push('6 pallonetto -> ' + (await waitStep(6)) + ' | ' + bub());
  await w(700); N.myThrow(G, 'd', bot.x, bot.y); out.push('7 dritto -> ' + (await waitStep(7)) + ' | ' + bub());
  out.push('Pierino fermo durante il tutorial: tiri suoi ' + G.st.ev.filter(e => (e[1] === 'td' || e[1] === 'tl') && e[4] === 1).length);
  // 8. fai palla al mucchio
  { const p = N.PS(G, G.me); cq.x = p.sx + 0.7; cq.y = p.sy; await w(400); const kb = $('#cqKill'); out.push('pulsante grande: ' + (kb && !kb.hidden ? kb.textContent : 'NASCOSTO') + ' | scorte ' + p.sk + ' in ' + p.sx + ',' + p.sy + ' io ' + cq.x.toFixed(2) + ',' + cq.y.toFixed(2) + ' fonte ' + JSON.stringify(N.srcFor(G, 0)) + ' mani ' + p.b + ' fermo ' + G.M.speed(G.me)); G.M.act(G); out.push('8 palla -> ' + (await waitStep(8, 3000)) + ' | ' + bub()); }
  // 9. gnomo: tocco il pulsante e poi il muro di Pierino
  { await w(400); const b = document.querySelector('#nvG [data-k=p]'); out.push('pulsanti degli gnomi: ' + !!b + ', palle ' + N.PS(G, G.me).b); if (b) { b.click(); await w(200); const B = G.S.bl.find(x => x.o === 1); if (B && N.U.gsel) { const cv = document.getElementById('cqCanvas').getBoundingClientRect(), V = G.camv, vz = cq.vz || 1, X = cv.left + (V.tx + (B.x - B.y) * V.TW / 2) * vz, Y = cv.top + (V.ty + (B.x + B.y) * V.TW / 4) * vz;
      cv && document.getElementById('cqCanvas').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: X, clientY: Y, pointerId: 7 })); document.getElementById('cqCanvas').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: X, clientY: Y, pointerId: 7 })); } }
    out.push('9 gnomo -> ' + (await waitStep(9)) + ' | gnomi ' + JSON.stringify(G.gn.map(g => [g.ty, g.tx != null ? g.tx.toFixed(1) : null])) + ' | ' + bub()); }
  // 10. fine: Pierino comincia
  out.push('10 fine -> ' + (await waitStep(10, 10000)) + ' | tutorial finito ' + !!G.tutDone + ', ricordato ' + store.settings.neveTut + ', riquadro ' + !!document.getElementById('nvTut'));
  await w(6000); out.push('dopo il tutorial Pierino tira: ' + G.st.ev.filter(e => (e[1] === 'td' || e[1] === 'tl') && e[4] === 1).length + ' tiri');
  if (window.__SHOT) return out.join('\n');
  // ---- la memoria di Pierino ----
  { const M = store.settings.nevePi; out.push('memoria dopo il tutorial (non deve imparare): ' + JSON.stringify(M)); }
  { store.settings.nevePi = { n: 3, hid: 70, tot: 140, lob: 3, dr: 9, sled: 0, fw: {} }; const r1 = N.piRead && N.piRead();
    store.settings.nevePi = { n: 3, hid: 10, tot: 140, lob: 20, dr: 4, sled: 0, fw: {} }; const r2 = N.piRead && N.piRead();
    store.settings.nevePi = { n: 3, hid: 10, tot: 140, lob: 3, dr: 20, sled: 0, fw: {} }; const r3 = N.piRead && N.piRead();
    out.push('Pierino ha capito: ti nascondi -> ' + (r1 && r1[1]) + ' | pallonetti -> ' + (r2 && r2[1]) + ' | dritti -> ' + (r3 && r3[1]));
    store.settings.nevePi = { n: 5, hid: 0, tot: 0, lob: 0, dr: 0, sled: 0, fw: { dritto: -4, zigzag: 3, ferro: 0, torri: 0 } }; const cnt = {};
    for (let i = 0; i < 400; i++) { G.botFort = null; const keep = G.st; G.st = Object.assign({}, keep, { n: 1, p: keep.p.map(p => Object.assign({}, p, { nv: 0 })) }); G.tut = false; N.botBuild(G, bot); cnt[G.botFort.n] = (cnt[G.botFort.n] || 0) + 1; G.st = keep; }
    out.push('fortini scelti (dritto ha perso, zigzag ha vinto): ' + JSON.stringify(cnt)); }
  delete store.settings.nevePi; saveStore();
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
