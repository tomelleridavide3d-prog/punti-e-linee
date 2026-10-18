// La Cosa online: i pulsanti della voce (🎤 🗣️) si vedono nella hall e in partita? node prove/cdp2.mjs . prove/cosvoce.mjs
const name = n => `(async () => {
  store.settings.myName = '${n}'; store.settings.sound = false; saveStore(); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'ciack' });
  const inp = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Il tuo nome' && i.offsetParent);
  if (inp) { inp.value = '${n}'; inp.dispatchEvent(new Event('input', { bubbles: true })); const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continua' && b.offsetParent); b && b.click(); }
  await new Promise(r => setTimeout(r, 400)); openCiack(); $('#pkGo').click(); return 'pronto';
})()`;
const vis = who => `(() => { const b = $('#cqVoice'), r = b.getBoundingClientRect(), k = $('#cqKill').getBoundingClientRect(), top = document.elementFromPoint(r.left + 20, r.top + 20); return '${who}: voce hidden=' + b.hidden + ' display=' + getComputedStyle(b).display + ' pos=' + [r.left, r.top, r.width, r.height].map(Math.round) + ' | pulsante grande ' + [k.left, k.top, k.width, k.height].map(Math.round) + ' | in cima: ' + (top ? (top.id || top.className || top.tagName) : '-'); })()`;
export default [
  [0, name('zzHost'), 0], [1, name('zzAmico'), 800],
  [0, `(async () => { $('#netNew').click(); await new Promise(r => setTimeout(r, 2500)); store.settings.cqOpt = Object.assign(cqOpt(), { game: 'cosa' }); cqNetList(); return 'host: set'; })()`, 1000],
  [1, `(async () => { const code = Object.keys(cq.sets || {}).find(k => cq.sets[k].h === 'zzHost'); cqNetJoin(code); await new Promise(r => setTimeout(r, 2000)); return 'amico nel set'; })()`, 500],
  [0, vis('host nella hall'), 0], [1, vis('amico nella hall'), 0],
  [0, `(async () => { cqNewMatch(); await new Promise(r => setTimeout(r, 4500)); return 'partita'; })()`, 1500],
  [0, vis('host in partita'), 0], [1, vis('amico in partita'), 0],
  [1, `(() => { cqNetLeave(); return 'amico uscito'; })()`, 500], [0, `(() => { cqNetLeave(); return 'fine'; })()`, 500],
];
