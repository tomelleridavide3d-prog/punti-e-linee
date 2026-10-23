// Duello all'alba dei bari: il tutorial col dito (passi, campana ferma finche' non si impara, Sceriffo che non spara, fine)
// uso: node prove/cdp.mjs . prove/bari3.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzBaProva'; store.settings.sound = false; delete store.settings.bariTut; saveStore();
  try { localStorage.setItem('bariHelp', '1'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzBaProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=bari]').click(); await w(2500);
  out.push('pulsante tutorial: ' + ($('#tkBody').textContent.includes('Tutorial') ? 'si' : 'NO'));
  window.bariTutorial(); await w(1500); cqCloseTask();
  const G = cq.g, B = window.__bari, M = G.M; if (!G || G.mode !== 'bari') return out.concat('partita non partita').join('\n');
  out.push('tutorial: ' + G.tut + ', passo ' + G.tutS);
  await w(3500);   // i 3 s di "pronti" con il motore vero
  const el = () => document.getElementById('baTut');
  out.push('fumetto: ' + (el() ? el().querySelector('span').textContent.slice(0, 50) : 'NO') + ' | dito ' + (el() ? el().querySelector('.fg').style.display !== 'none' : '-'));
  await w(16000); out.push('dopo 16 s senza toccare: fase ' + G.st.ph + ' (deve restare load), passo ' + G.tutS);
  for (const i of [0, 2, 4]) { document.querySelector('#baLoad .ch[data-i="' + i + '"]').click(); await w(150); }
  await w(300); out.push('3 colpi messi: passo ' + G.tutS); document.querySelector('#baLoad .ok').click(); await w(500);
  out.push('pronto: fase ' + G.st.ph + ', passo ' + G.tutS);
  await w(4500); out.push('dopo i passi: fase ' + G.st.ph + ', passo ' + G.tutS + ' | fumetto ' + (el() ? el().querySelector('span').textContent.slice(0, 40) : '-'));
  await w(3000); out.push('campana ferma finche\' non mi riparo: rintocco ' + B.bellK(G, G.time) + ' (deve essere -1)');
  const cv = G.st.cv.filter(c => c[3] > 0 && c[1] < 13).sort((a, b) => Math.hypot(a[1] - cq.x, a[2] - cq.y) - Math.hypot(b[1] - cq.x, b[2] - cq.y))[0], o = G.chars.find(c => c.bot);
  const dx = cv[1] + 0.5 - o.x, dy = cv[2] + 0.5 - o.y, l = Math.hypot(dx, dy); cq.x = cv[1] + 0.5 + dx / l * 0.9; cq.y = cv[2] + 0.5 + dy / l * 0.9;
  await w(9000); out.push('al riparo: passo ' + G.tutS + ', rintocco ' + B.bellK(G, G.time));
  for (let i = 0; i < 80 && !G.tutShot; i++) { if (B.winOpen(G, G.time) >= 0) document.getElementById('baShoot').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(100); }
  await w(500); out.push('sparato: passo ' + G.tutS + ', spari ' + G.st.sh.map(e => e[2] + ':' + e[3]).join(','));
  for (let i = 0; i < 320 && G.tutS < 9; i++) { if (G.tutS === 7 && B.winOpen(G, G.time) >= 0) document.getElementById('baDive').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await w(100); } out.push('fine tutorial: passo ' + G.tutS + ', salvato ' + store.settings.bariTut + ', fumetto ' + !!el() + ', Sceriffo libero ' + !o.hold);
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  return out.join('\n');
})()
