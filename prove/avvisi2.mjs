// avviso dello sviluppatore: "Hey {nome}" arriva all'amico iscritto (serve il postino con il codice di prova)
export const plain0 = 1;
export default [
  [0, `(async () => { store.settings.myName = 'zzMarco'; saveStore(); await pushToggle(); return 'iscritto: ' + store.settings.pushId; })()`, 1000],
  [0, `(async () => { const q = ['🎮 Hey {nome}!', 'Sono arrivati nuovi minigiochi!', 'zzprova']; window.prompt = () => q.shift(); window.confirm = () => false; let a = ''; window.alert = t => { a = t; }; await pushSend(); return 'sviluppatore: ' + a; })()`, 8000],
  [0, `(async () => { const to = p => Promise.race([p, new Promise((_, j) => setTimeout(() => j(new Error('tempo scaduto')), 5000))]); const reg = await to(navigator.serviceWorker.getRegistration()); const n = await to(reg.getNotifications()); return 'notifiche: ' + (n.map(x => x.title + ' / ' + x.body + (x.silent ? ' (silenziosa)' : '')).join(' ; ') || 'nessuna'); })()`, 0],
  [0, `(async () => { await Promise.race([pushToggle(), new Promise(r => setTimeout(r, 5000))]); const r = await (await fetch(PUSH_W + '/count')).json(); return 'spento; iscritti rimasti ' + r.iscritti; })()`, 0],
];
