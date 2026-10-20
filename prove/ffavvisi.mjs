// Firefox: iscrizione agli avvisi e avviso dello sviluppatore che arriva (serve il postino con il codice di prova zzprova)
const notif = `(async () => { const reg = await navigator.serviceWorker.getRegistration(); const n = reg ? await reg.getNotifications() : []; return 'notifiche: ' + (n.map(x => x.title + ' / ' + x.body).join(' ; ') || 'nessuna'); })()`;
export default [
  [`(async () => { store.settings.myName = 'zzFirefox'; saveStore(); return navigator.userAgent.slice(-30) + ' | supporta avvisi ' + pushOk() + ' | permesso ' + Notification.permission; })()`, 0],
  [`(async () => { await pushToggle(); return 'iscritto: ' + (store.settings.pushId || 'NO') + ' | ' + ((await (await navigator.serviceWorker.getRegistration()).pushManager.getSubscription()) || {}).endpoint?.slice(0, 45); })()`, 1000],
  [`(async () => { const r = await pushPost('/msg', { pass: 'zzprova', zz: 1, title: '🎮 Hey {nome}!', body: 'Prova da Firefox', loud: false }); return 'mandato: ' + JSON.stringify(r); })()`, 8000],
  [notif, 0],
  [`(async () => { await Promise.race([pushToggle(), new Promise(r => setTimeout(r, 5000))]); return 'spento'; })()`, 1000],
];
