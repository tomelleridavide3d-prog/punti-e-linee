// Duello degli alchimisti: TUTORIAL guidato (dal riquadro 🎓 delle impostazioni, 11 passi, una manche sola). uso: node prove/cdp.mjs . prove/alc23.js [foto.png]
// con localStorage zzTutStop = N si ferma al passo N (per la foto)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [], stop = +(localStorage.getItem('zzTutStop') || 99);
  store.settings.myName = 'zzAlProva'; const S = store.settings, t0 = S.alcTut, g0 = S.alcGames; delete S.alcTut; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(400);
  const box = document.getElementById('alTutBox'); out.push('impostazioni: riquadro ' + (box ? box.textContent.replace(/\s+/g, ' ') : 'NO'));
  box.querySelector('button').click(); await w(1500);
  const G = cq.g, A = window.__alc; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  const bub = () => { const e = document.querySelector('#alTut .bub span'); return e ? e.textContent.slice(0, 60) : '(nessuno)'; }, step = () => G.tutS;
  const log = tag => out.push(tag + ' -> passo ' + (step() + 1) + ': ' + bub() + ' | dito ' + (document.querySelector('#alTut .fg') || {}).style?.display);
  await w(3200); log('inizio (tutorial ' + G.tut + ', piante ' + (G.pl || []).length + ', timer ' + $('#alTm').textContent + ')');
  const cv = document.getElementById('cqCanvas'), scr = (x, y) => { const V = G.camv, rc = cv.getBoundingClientRect(), vz = cq.vz || 1; return [rc.left + (V.tx + (x - y) * V.TW / 2) * vz, rc.top + (V.ty + (x + y) * V.TW / 4) * vz]; };
  const tap = async (x, y) => { const [sx, sy] = scr(x, y), ev = t => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 9, clientX: sx, clientY: sy, isPrimary: true })); G.me.thT = 0; ev('pointerdown'); await w(60); ev('pointerup'); };
  const go = async (fn, tag, ms = 400) => { if (step() + 1 >= stop) return true; await fn(); await w(ms); log(tag); return false; };
  if (await go(() => document.querySelector('#alJars [data-i="f"]').click(), 'tocco il peperoncino')) return out.join('\n');
  if (await go(() => $('#alBot').click(), 'imbottiglio')) return out.join('\n');
  if (await go(() => { document.querySelector('#alJars [data-i="r"]').click(); $('#alBot').click(); }, 'resina e imbottiglio')) return out.join('\n');
  if (await go(() => $('#alFill').click(), 'riempi per me')) return out.join('\n');
  out.push('   timer fermo? ' + $('#alTm').textContent);
  if (await go(() => $('#alRdy').click(), 'pronto', 1200)) return out.join('\n');
  const bot = G.chars.find(c => c.bot);
  if (await go(() => { const i = G.me.belt.findIndex(k => k.includes('r')); document.querySelector('#alSel [data-s="' + i + '"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, 'scelgo la colla')) return out.join('\n');
  if (await go(() => tap(bot.x, bot.y), 'tocco l\'avversario (colla)', 1800)) return out.join('\n');
  if (await go(async () => { const i = G.me.belt.findIndex(k => k.includes('f')); G.sel = i; await tap(bot.x, bot.y); }, 'fuoco sull\'incollato', 1800)) return out.join('\n');
  out.push('   cuori del computer dopo la combo: ' + bot.hp);
  if (await go(() => { G.me.thT = 0; G.sel = G.me.belt.findIndex(Boolean); $('#alDr').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, 'bevo', 800)) return out.join('\n');
  if (await go(async () => { const [kx, ky] = A.KETTLE[0]; cq.x = kx + 0.5; cq.y = ky + 1.2; await w(200); G.M.act(G); await w(2800); }, 'al calderone e ricarica')) return out.join('\n');
  out.push('   ultimo passo: computer fermo? ' + bot.hold + ', cuori ' + G.me.hp + '-' + bot.hp + ', timer duello ' + $('#cqModeBar').textContent.slice(-5));
  await w(5500); out.push('   dopo 5 s: fumetto ' + !!document.getElementById('alTut'));
  bot.hp = 1; bot.iv = 0; A.burst(G, 'f', bot.x, bot.y, G.me.id); await w(1500);
  out.push('fine manche: ' + G.st.ph + ', finita ' + G.st.fin + ' | tutorial fatto ' + store.settings.alcTut + ' | partite contate ' + store.settings.alcGames + ' (prima ' + g0 + ')');
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 400));
  if (t0) S.alcTut = t0; saveStore();
  return out.join('\n');
})()
