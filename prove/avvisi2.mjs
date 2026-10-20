// avviso di PROVA (zz: 1 = solo ai telefoni di prova, mai agli amici veri): "Hey {nome}" arriva all'iscritto zzMarco
// serve il postino con il codice di prova: deploy con --var DEV_H:<sha256 di zzprova>, poi deploy normale
export const plain0 = 1;
export default [
  [0, `(async () => { store.settings.myName = 'zzMarco'; saveStore(); await pushToggle(); return 'iscritto: ' + store.settings.pushId; })()`, 1000],
  [0, `(async () => { const r = await pushPost('/msg', { pass: 'zzprova', zz: 1, title: '🎮 Hey {nome}!', body: 'Sono arrivati nuovi minigiochi!', loud: false }); return 'mandato: ' + JSON.stringify(r); })()`, 8000],
  [0, `(async () => { const to = p => Promise.race([p, new Promise((_, j) => setTimeout(() => j(new Error('tempo scaduto')), 5000))]); const reg = await to(navigator.serviceWorker.getRegistration()); const n = await to(reg.getNotifications()); return 'notifiche: ' + (n.map(x => x.title + ' / ' + x.body + (x.silent ? ' (silenziosa)' : '')).join(' ; ') || 'nessuna'); })()`, 0],
  [0, `(async () => { await Promise.race([pushToggle(), new Promise(r => setTimeout(r, 5000))]); const r = await (await fetch(PUSH_W + '/count')).json(); return 'spento; iscritti rimasti ' + r.iscritti; })()`, 0],
];
