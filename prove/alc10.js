// Duello degli alchimisti: BERE O LANCIARE (mantello di fiamme, scatto, scudo a specchio, piedi piantati, fumo, statua, il computer che beve).
// uso: node prove/cdp.mjs . prove/alc10.js
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms)), out = [];
  store.settings.myName = 'zzAlProva'; saveStore(); try { localStorage.setItem('alcHelp2', '{"prep":1,"duel":1}'); } catch {}
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = 'zzAlProva'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await w(300); openCiack(); $('#pkGo').click(); await w(500);
  document.querySelector('#tkBody [data-g=alchimisti]').click(); await w(2500);
  cqCloseTask(); cqLobby(); await w(300); $('#lbGo').click(); await w(1500);
  const G = cq.g, A = window.__alc, M = G.M; if (!G || G.mode !== 'alchimisti') return 'partita non partita';
  cq.on = false; cancelAnimationFrame(cq.raf); const toasts = []; window.cqToast = t => toasts.push(t.replace(/<[^>]+>/g, ''));
  const step = (s, dt = 0.05) => { for (let i = 0; i < s / dt; i++) { cqModeTick(dt); M.local(G, dt); } };
  const bot = G.chars.find(c => c.bot);
  step(3.5); G.me.belt = ['f', 'v', 'm', 'r']; A.setReady(G, true); step(0.3); A.useFloor(2); G.pl = [];
  const fresh = () => { for (const c of G.chars) { c.hp = 3; c.iv = 0; c.fx = {}; c.sl = null; c.thT = 0; } cq.sl = null; G.zn = []; G.fl = []; G.pend = []; bot.hold = 1; bot.path = []; G.st.t0 = G.time; };
  const drink = k => { G.me.belt = [k, '', '', '']; G.sel = 0; G.me.thT = 0; A.myDrink(G); step(0.15); };
  out.push('fase ' + G.st.ph + ', pulsante bevi ' + !!document.getElementById('alDr'));
  out.push('cosa fanno bevute: ' + ['f', 'i', 'v', 'r', 'm', 'c', 's', 'g', 'p', 'fi', 'ir', 'o'].map(k => A.brew(k).n + ' = ' + A.drinkTxt(A.brew(k))).join(' || '));
  // mantello di fiamme
  fresh(); cq.x = 6.5; cq.y = 13.5; drink('f'); const fx1 = Object.keys(G.me.fx).filter(k => !k.includes('@')).join(',');
  A.burst(G, 'f', cq.x, cq.y, bot.id); step(2.5); out.push('🔥 bevuto: stati ' + fx1 + ', poi fuoco addosso e 2,5 s nella pozza: cuori ' + G.me.hp + ' | avviso: ' + (toasts.filter(t => /bevuto/.test(t)).pop() || 'NO'));
  // scatto
  fresh(); cq.x = 6.5; cq.y = 13.5; G.vx = 4; G.vy = 0; const x0 = cq.x; drink('v'); step(0.6); out.push('🦅 bevuto camminando a destra: spostato di ' + (cq.x - x0).toFixed(1) + ' caselle, cuori ' + G.me.hp);
  fresh(); cq.x = 13; cq.y = 10.5; G.vx = -4; G.vy = 0; drink('v'); step(0.6); out.push('   scatto verso la voragine: si ferma al bordo? caduto ' + (G.myFall != null) + ', a ' + cq.x.toFixed(1) + ',' + cq.y.toFixed(1));
  // scudo a specchio
  fresh(); cq.x = 6.5; cq.y = 13.5; bot.x = 13.5; bot.y = 8.5; drink('m'); bot.belt = ['f', '', '', '']; A.throwFrom(G, bot, 0, cq.x, cq.y); step(3);
  out.push('🪞 bevuto, il computer mi lancia il fuoco: miei cuori ' + G.me.hp + ', suoi ' + bot.hp + ', scudo ancora ' + !!(G.me.fx.shield > G.time));
  // piedi piantati
  fresh(); cq.x = 6.5; cq.y = 13.5; drink('r'); const p0 = [cq.x, cq.y]; A.burst(G, 'v', cq.x - 0.5, cq.y, bot.id); step(0.8); out.push('🍯 bevuta, vento addosso: spostato di ' + Math.hypot(cq.x - p0[0], cq.y - p0[1]).toFixed(2));
  // fumo: sparisco
  fresh(); cq.x = 6.5; cq.y = 13.5; bot.x = 13.5; bot.y = 8.5; drink('c'); out.push('🌫️ bevuta: nascosto per il computer ' + M.hide(G.me) + ' (hide di me su questo telefono, deve essere false) | lui mi lancia? ');
  bot.hold = 0; bot.belt = ['f', 'f', '', '']; bot.aimT = 0; const n0 = G.flN; step(2); out[out.length - 1] += (G.flN - n0) + ' lanci in 2 s';
  // statua
  fresh(); cq.x = 6.5; cq.y = 13.5; drink('ir'); A.burst(G, 'f', cq.x, cq.y, bot.id); step(0.2); out.push('🧊 cristallo bevuto (statua): fuoco addosso -> cuori ' + G.me.hp + ', velocita ' + M.speed(G.me).toFixed(2));
  // il computer beve per salvarsi
  let drinks = 0; for (let i = 0; i < 12; i++) { fresh(); bot.hold = 0; bot.x = 13.5; bot.y = 8.5; bot.belt = ['v', 'm', 'i', 'p']; bot.drT = 0; cq.x = 6.5; cq.y = 13.5; G.me.belt = ['f', '', '', '']; G.sel = 0; A.myThrow(G, bot.x, bot.y); const h0 = G.hxN; step(1.4); if (G.hx.some(h => h[0] > h0 && h[3] === 'drink' && h[1] === bot.id)) drinks++; }
  out.push('🤖 il computer sotto tiro con pozioni da bere: ha bevuto ' + drinks + ' volte su 12');
  fresh(); bot.hp = 1; bot.hold = 0; bot.belt = ['f', 'm', '', '']; bot.drT = 0; let dr2 = 0; const h1 = G.hxN; step(6); dr2 = G.hx.filter(h => h[0] > h1 && h[3] === 'drink' && h[1] === bot.id).map(h => h[2]); out.push('   con un cuore solo in 6 s: ' + (dr2.join(' | ') || 'non beve'));
  // etichetta
  fresh(); G.me.belt = ['f', '', '', '']; G.sel = 0; step(0.1); out.push('etichetta: ' + document.getElementById('alNm').textContent);
  out.push('errori: ' + (localStorage.getItem('errLog') || 'nessuno').slice(0, 600));
  return out.join('\n');
})()
