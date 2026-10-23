// Officina dei robot: tutto il tutorial (dito che indica, Nonno fermo finche' non hai imparato), poi la battaglia vera riparte.
// uso: node prove/cdp.mjs . prove/rob4.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzRoProva'; store.settings.sound = false; store.settings.robotTut = 0; saveStore();
  try { localStorage.setItem('robotHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzRoProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=robot]').click(); await w(2200);
  const tb = [...document.querySelectorAll('#tkBody button')].find(b => b.textContent.includes('Tutorial')); if (!tb) return 'manca il pulsante del tutorial';
  tb.click(); await w(1500);
  const G = cq.g, N = window.__robot; if (!G || !G.tut) return 'tutorial non partito';
  const seen = []; const note = () => { const b = document.querySelector('#rbTut .bub'); const k = b ? b.dataset.k : '-'; if (seen[seen.length - 1] !== k) seen.push(k); };
  const waitStep = async (k, ms = 4000) => { const t = performance.now(); while (performance.now() - t < ms) { note(); if (G.tutS >= k) return true; await w(100); } return false; };
  await w(3500); note();
  out.push('passo 1 (dito su ' + (document.querySelector('#rbTut .fg') && document.querySelector('#rbTut .fg').style.display !== 'none' ? 'si' : 'NO') + ')');
  document.querySelector('#rbBuild [data-p=sega]').click(); out.push('monto la sega -> ' + (await waitStep(1) ? 'passo 2' : 'BLOCCATO'));
  N.U.sel = 2; document.querySelector('#rbBuild [data-p=piastre]').click(); out.push('acciaio dietro -> ' + (await waitStep(2) ? 'passo 3' : 'BLOCCATO'));
  document.querySelector('#rbBuild [data-k=r]').click(); out.push('pronto -> ' + (await waitStep(3, 9000) ? 'passo 4 (fase ' + G.st.ph + ')' : 'BLOCCATO (fase ' + G.st.ph + ')'));
  const b0 = { x: G.chars[1].x, y: G.chars[1].y };
  cq.keys.d = true; out.push('guido -> ' + (await waitStep(4, 6000) ? 'passo 5' : 'BLOCCATO')); delete cq.keys.d;
  out.push('il Nonno e\' rimasto fermo: ' + (Math.hypot(G.chars[1].x - b0.x, G.chars[1].y - b0.y) < 0.2));
  // vado vicino al Nonno e premo il pulsante quando si accende
  const R = N.U.R, B = G.chars[1]; R.x = cq.x = B.x - 1.0; R.y = cq.y = B.y; R.a = 0; await w(400);
  const btn = document.querySelector('#rbW button'); out.push('pulsante acceso: ' + (btn && btn.classList.contains('hot')));
  btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); out.push('sparo -> ' + (await waitStep(5) ? 'passo 6' : 'BLOCCATO'));
  out.push('ultimo -> ' + (await waitStep(6, 11000) ? 'finito' : 'BLOCCATO') + ', tutorial ricordato ' + store.settings.robotTut + ', fumetti visti ' + seen.join(','));
  await w(600); out.push('dopo: il Nonno si muove ' + !G.tutHold + ', fase ' + G.st.ph + ', tempo di battaglia ripartito ' + (G.time - G.st.t0).toFixed(1) + ' s');
  return out.join('\n');
})()
