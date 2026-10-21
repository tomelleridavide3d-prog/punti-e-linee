// salotto della hall (foto): 4 persone nel set = 4 poltrone; io seduto che bevo, un amico seduto che beve, uno che da' lo schiaffo e uno a terra.
// Gli amici sono finti ma scritti davvero nel set su Firebase (nomi zz, si cancellano chiudendo il set)
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), o = [];
  store.settings.myName = 'zzIo'; store.settings.cqLook = { skin: 'pane' }; saveStore();
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzIo'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await sl(400); openCiack(); $('#pkGo').click(); await sl(1500);
  $('#netNew').click(); await sl(3000);
  const N = cq.net, F = N.F, put = (p, v) => F.set(cqNetRef(`cq/${N.code}/${p}`), v);
  const fake = { zzA: ['zzLupo', 'lupo'], zzB: ['zzProcione', 'procione'], zzC: ['zzBassotto', 'bassotto'] };
  for (const [sid, [n, sk]] of Object.entries(fake)) await put('pl/' + sid, { name: n, look: { skin: sk, col: '#888', hat: 'nessuno' }, ts: Date.now() });
  await put('hl/zzA', { x: 3.5, y: 10, i: 1, s: 3, dk: 0, sw: 0, f: 1, r: 0, d: 0 });
  await put('hl/zzB', { x: 6.3, y: 12.7, i: 1, s: 0, dk: 0, sw: 0, f: -1, r: 1, d: 0 });
  await put('hl/zzC', { x: 7.6, y: 13.6, i: 1, s: 0, dk: 0, sw: 0, f: 1, r: 0, d: 0 });
  await sl(800);
  o.push('poltrone ' + cqSalaSeats().length + ', nella hall ' + cq.g.chars.length);
  cq.x = 4.4; cq.y = 13.6; await sl(300);
  o.push('vicino: ' + (!$('#cqSit').hidden ? $('#cqSit').textContent : 'Siediti NASCOSTO'));
  $('#cqSit').click(); await sl(300);
  o.push('seduto sulla poltrona ' + cq.sit + ', ' + $('#cqSit').textContent + ' / ' + (!$('#cqDrink').hidden ? $('#cqDrink').textContent : 'Bevi NASCOSTO'));
  o.push('lupo seduto: ' + (cq.g.chars.find(c => c.sid === 'zzA') || {}).sit);
  await put('hl/zzA', { x: 3.5, y: 10, i: 1, s: 3, dk: 1, sw: 0, f: 1, r: 0, d: 0 });
  await put('hl/zzC', { x: 9.2, y: 14.2, i: 1, s: 0, dk: 0, sw: 0, f: 1, r: 0, d: 1, k: 1 });
  await put('hl/zzB', { x: 6.3, y: 12.7, i: 1, s: 0, dk: 0, sw: 1, f: 1, r: 1, d: 0 });
  $('#cqDrink').click(); await sl(900);
  document.querySelectorAll('.toast,#cqToast').forEach(e => e.remove());
  o.push('a terra: ' + cq.g.bodies.map(b => b.name + (b.sl ? ' (schiaffo)' : '')).join(', '));
  o.push('errori: ' + (document.getElementById('errBar') ? document.getElementById('errBar').textContent : 'nessuno'));
  setTimeout(() => { for (const s of Object.keys(fake)) { F.remove(cqNetRef(`cq/${N.code}/pl/${s}`)); F.remove(cqNetRef(`cq/${N.code}/hl/${s}`)); } cqNetLeave(); }, 1500);
  return o.join(' | ');
})()
